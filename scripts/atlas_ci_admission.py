#!/usr/bin/env python3
"""Atlas Actions admission triage: OFFLINE by default, GET-only with --live.

Never dispatches Actions, changes policies, approves publication, or rewrites history.
An observed failed job with no runner/steps is NOT classified as a source test failure.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.request

REPOS = frozenset({
    "atlaslattice/Atlas-Intelligence",
    "atlaslattice/atlas-lattice-providers",
    "atlaslattice/noosphere-archive",
})

def positive_id(value):
    return type(value) is int and value > 0


def full_sha(value):
    return isinstance(value, str) and len(value) == 40 and all(c in "0123456789abcdef" for c in value)


def valid_steps(steps):
    return isinstance(steps, list) and bool(steps) and all(isinstance(step, dict) for step in steps)


def evaluate_job(job):
    status, conclusion = job.get("status"), job.get("conclusion")
    runner = job.get("runner_id")
    steps = job.get("steps")
    if status not in ("completed", None):
        return "PENDING"
    if conclusion == "failure" and (type(runner) is not int or not isinstance(steps, list)):
        return "HELD_INCOMPLETE_OBSERVATION"
    if status == "completed" and type(runner) is int and runner == 0 and steps == [] and conclusion == "failure":
        return "HELD_PRE_RUNNER_UNKNOWN"
    if conclusion == "failure":
        return "EXECUTED_HOST_FAILURE" if positive_id(runner) and valid_steps(steps) else "HELD_STARTUP_UNKNOWN"
    if conclusion != "success":
        return "HELD_NOT_SUCCESSFUL"
    if not positive_id(runner) or not valid_steps(steps):
        return "HELD_INCOMPLETE_RUNNER_PROOF"
    if any(step.get("conclusion") != "success" for step in steps):
        return "HELD_INCOMPLETE_STEP_PROOF"
    if job.get("logs_verified") is not True:
        return "HOST_STEPS_PASS_LOGS_UNVERIFIED"
    return "HOSTED_EXECUTION_ACCEPTED" if status == "completed" else "HELD_MISSING_COMPLETED_STATUS"

def evaluate_snapshot(document):
    results = []
    gaps = []
    run_keys, job_keys = set(), set()
    runs = document["runs"]
    if not isinstance(runs, list):
        raise ValueError("runs must be a list")
    if not runs:
        gaps.append({"reason": "NO_RUN_EVIDENCE"})
    for entry in runs:
        repo = entry["repository"]
        if repo not in REPOS:
            raise ValueError("unexpected repository: " + str(repo))
        actual = entry.get("head_sha")
        expected = entry.get("expected_head_sha")
        if not full_sha(actual):
            raise ValueError("missing/invalid full SHA for run " + str(entry.get("run_id")))
        run_id = entry["run_id"]
        if not positive_id(run_id) or (repo, run_id) in run_keys:
            raise ValueError("invalid or duplicate run identity")
        run_keys.add((repo, run_id))
        source_status = ("MISSING_SOURCE_PIN" if not full_sha(expected) else
                         "STALE_SOURCE_PIN" if actual != expected else "PINNED_SOURCE_MATCH")
        current_pr_head = entry.get("current_pr_head_sha")
        if entry.get("pr_number") is not None and (not positive_id(entry["pr_number"]) or not full_sha(current_pr_head)):
            source_status = "MISSING_PR_HEAD_PIN"
        elif current_pr_head is not None and (not full_sha(current_pr_head) or actual != current_pr_head):
            source_status = "STALE_PR_HEAD"
        jobs = entry["jobs"]
        if not isinstance(jobs, list):
            raise ValueError("jobs must be a list")
        if not jobs:
            gaps.append({"repository": repo, "run_id": run_id, "reason": "NO_JOB_EVIDENCE"})
        for job in jobs:
            if not isinstance(job, dict) or not positive_id(job.get("id")) or (repo, job["id"]) in job_keys:
                raise ValueError("invalid or duplicate job identity")
            job_keys.add((repo, job["id"]))
            state = evaluate_job(job)
            results.append({
                "repository": repo,
                "run_id": entry["run_id"],
                "workflow": entry["workflow"],
                "head_sha": actual,
                "job_id": job["id"],
                "job_name": job.get("name"),
                "runner_id": job.get("runner_id"),
                "executed_steps": len(job["steps"]) if isinstance(job.get("steps"), list) else None,
                "job_state": state,
                "source_status": source_status,
                "admission_proven": positive_id(job.get("runner_id")) and valid_steps(job.get("steps")),
                "hosted_acceptance": state == "HOSTED_EXECUTION_ACCEPTED" and source_status == "PINNED_SOURCE_MATCH",
            })
    refused = sorted({r["repository"] for r in results if r["job_state"] == "HELD_PRE_RUNNER_UNKNOWN"})
    blocker_count = sum(not r["hosted_acceptance"] for r in results)
    return {
        "schema": "atlas.actions.admission-assessment/v1",
        "root_cause": "UNKNOWN",
        "cross_repository_admission_pattern": len(refused) >= 2,
        "repos_pre_runner_failures": refused,
        "jobs_total": len(results),
        "jobs_not_host_accepted": blocker_count,
        "coverage_gaps": gaps,
        "release_gate": "HELD" if blocker_count or gaps else "CI_EXECUTED_SCOPE_ONLY",
        "jobs": results,
        "limits": [
            "Job records do not establish account, billing, policy, or platform root cause",
            "Even accepted hosted CI is not CANON, rights-at-RETURN or deployment authority",
        ],
    }

def github_json(url, token=None):
    """GET-only, constrained to three known public repos; never logs credentials."""
    prefix = "https://api.github.com/repos/"
    if not url.startswith(prefix):
        raise ValueError("non-GitHub API endpoint refused")
    suffix = url[len(prefix):]
    if not any(suffix.startswith(repo + "/") for repo in REPOS):
        raise ValueError("repository outside Atlas incident refused")
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "atlas-actions-readonly-admission-v1",
    }
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(url, headers=headers, method="GET")
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)

def pr_link_matches(link, number, repo):
    """GitHub lightweight PR links may contain repo URL rather than full_name.

    An explicit contradictory identity is never repaired by a second field.
    """
    if not isinstance(link, dict) or type(link.get("number")) is not int or link["number"] != number:
        return False
    base = link.get("base")
    r = base.get("repo") if isinstance(base, dict) else None
    if not isinstance(r, dict):
        return False
    full_name, url = r.get("full_name"), r.get("url")
    if full_name is not None and full_name != repo:
        return False
    if url is not None and url != "https://api.github.com/repos/" + repo:
        return False
    return full_name == repo or url == "https://api.github.com/repos/" + repo


def collect_live(index):
    token = os.getenv("GH_TOKEN") or os.getenv("GITHUB_TOKEN")
    collected = {"runs": []}
    for item in index["runs"]:
        repo = item["repository"]
        if repo not in REPOS:
            raise ValueError("unexpected repository")
        run_id = item["run_id"]
        pr_number = item.get("pr_number")
        if not positive_id(run_id) or (pr_number is not None and not positive_id(pr_number)):
            raise ValueError("invalid run or PR identity")
        base = "https://api.github.com/repos/" + repo + "/actions/runs/" + str(run_id)
        metadata = github_json(base, token)
        attempt = metadata.get("run_attempt")
        if metadata.get("id") != run_id or not positive_id(attempt) or not full_sha(metadata.get("head_sha")):
            raise ValueError("run identity, attempt or source missing")
        if metadata.get("event") in ("pull_request", "pull_request_target") and pr_number is None:
            raise ValueError("PR-triggered evidence requires explicit PR identity")
        if pr_number is not None:
            links = metadata.get("pull_requests")
            if not isinstance(links, list) or not any(pr_link_matches(link, pr_number, repo) for link in links):
                raise ValueError("run does not establish requested PR association")
        pr_url = "https://api.github.com/repos/" + repo + "/pulls/" + str(pr_number) if pr_number is not None else None
        current_pr_head = github_json(pr_url, token)["head"]["sha"] if pr_url else None
        job_response = github_json(base + "/attempts/" + str(attempt) + "/jobs?per_page=100", token)
        jobs = job_response.get("jobs")
        count = job_response.get("total_count")
        if type(count) is not int or not isinstance(jobs, list) or count != len(jobs) or count > 100:
            raise RuntimeError("incomplete or inconsistent job evidence")
        for job in jobs:
            # The attempt-specific endpoint itself binds membership. GitHub's
            # documented job example omits run_attempt; if supplied it must agree.
            if (type(job.get("run_id")) is not int or job.get("run_id") != run_id or
                    ("run_attempt" in job and (type(job["run_attempt"]) is not int or job["run_attempt"] != attempt)) or
                    job.get("head_sha") != metadata["head_sha"]):
                raise ValueError("job does not match pinned run attempt and source")
        final = github_json(base, token)
        if any(final.get(k) != metadata.get(k) for k in ("id", "run_attempt", "head_sha", "status", "conclusion")):
            raise RuntimeError("run changed during collection")
        if pr_url and github_json(pr_url, token)["head"]["sha"] != current_pr_head:
            raise RuntimeError("PR head changed during collection")
        collected["runs"].append({
            "repository": repo,
            "run_id": run_id,
            "run_attempt": attempt,
            "job_attempt_binding": "ATTEMPT_ENDPOINT_AND_RUN_RECHECK",
            "workflow": metadata.get("path") or item["workflow"],
            "head_sha": metadata["head_sha"],
            "expected_head_sha": item.get("expected_head_sha"),
            "pr_number": pr_number,
            "current_pr_head_sha": current_pr_head,
            "jobs": [{
                "id": j["id"], "name": j.get("name"), "status": j.get("status"),
                "conclusion": j.get("conclusion"), "runner_id": j.get("runner_id"),
                "steps": j.get("steps"), "logs_verified": False,
            } for j in jobs],
        })
    return collected

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--live", action="store_true", help="GitHub API GET only")
    parser.add_argument("--out", type=Path, help="Output JSON locally; never upload")
    args = parser.parse_args(argv)
    try:
        with args.snapshot.open(encoding="utf-8") as stream:
            index = json.load(stream)
        result = evaluate_snapshot(collect_live(index) if args.live else index)
    except (KeyError, TypeError, AttributeError, ValueError, RuntimeError, OSError, urllib.error.URLError) as error:
        print("HELD: incomplete evidence: " + str(error), file=sys.stderr)
        return 2
    payload = json.dumps(result, indent=2, sort_keys=True) + "\n"
    if args.out:
        args.out.write_text(payload, encoding="utf-8")
    else:
        print(payload, end="")
    return 3 if result["release_gate"] == "HELD" else 0

if __name__ == "__main__":
    raise SystemExit(main())
