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

def evaluate_job(job):
    status, conclusion = job.get("status"), job.get("conclusion")
    runner = job.get("runner_id") or 0
    steps = job.get("steps")
    if status not in ("completed", None):
        return "PENDING"
    if not runner and not steps:
        return "HELD_PRE_RUNNER_UNKNOWN"
    if conclusion == "failure":
        return "EXECUTED_HOST_FAILURE" if steps else "HELD_STARTUP_UNKNOWN"
    if conclusion != "success":
        return "HELD_NOT_SUCCESSFUL"
    if not runner or not isinstance(steps, list) or not steps:
        return "HELD_INCOMPLETE_RUNNER_PROOF"
    if any(step.get("conclusion") != "success" for step in steps):
        return "HELD_INCOMPLETE_STEP_PROOF"
    if job.get("logs_verified") is not True:
        return "HOST_STEPS_PASS_LOGS_UNVERIFIED"
    return "HOSTED_EXECUTION_ACCEPTED"

def evaluate_snapshot(document):
    results = []
    for entry in document["runs"]:
        repo = entry["repository"]
        if repo not in REPOS:
            raise ValueError("unexpected repository: " + str(repo))
        actual = entry.get("head_sha")
        expected = entry.get("expected_head_sha")
        if not actual or len(actual) != 40 or any(c not in "0123456789abcdef" for c in actual):
            raise ValueError("missing/invalid full SHA for run " + str(entry.get("run_id")))
        source_status = "STALE_SOURCE_PIN" if expected and actual != expected else "PINNED_SOURCE_MATCH"
        current_pr_head = entry.get("current_pr_head_sha")
        if current_pr_head and actual != current_pr_head:
            source_status = "STALE_PR_HEAD"
        for job in entry["jobs"]:
            state = evaluate_job(job)
            results.append({
                "repository": repo,
                "run_id": entry["run_id"],
                "workflow": entry["workflow"],
                "head_sha": actual,
                "job_id": job["id"],
                "job_name": job.get("name"),
                "runner_id": job.get("runner_id") or 0,
                "executed_steps": len(job.get("steps") or []),
                "job_state": state,
                "source_status": source_status,
                "admission_proven": bool(job.get("runner_id") and job.get("steps")),
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
        "release_gate": "HELD" if blocker_count else "CI_EXECUTED_SCOPE_ONLY",
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

def collect_live(index):
    token = os.getenv("GH_TOKEN") or os.getenv("GITHUB_TOKEN")
    collected = {"runs": []}
    for item in index["runs"]:
        repo = item["repository"]
        if repo not in REPOS:
            raise ValueError("unexpected repository")
        run_id = int(item["run_id"])
        base = "https://api.github.com/repos/" + repo + "/actions/runs/" + str(run_id)
        metadata = github_json(base, token)
        pr_number = item.get("pr_number")
        current_pr_head = (github_json("https://api.github.com/repos/" + repo + "/pulls/" + str(int(pr_number)), token)["head"]["sha"] if pr_number else item.get("current_pr_head_sha"))
        job_response = github_json(base + "/jobs?per_page=100", token)
        jobs = job_response.get("jobs", [])
        if job_response.get("total_count", 0) > len(jobs):
            raise RuntimeError("job evidence is paginated; complete it before acceptance")
        collected["runs"].append({
            "repository": repo,
            "run_id": run_id,
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
    with args.snapshot.open(encoding="utf-8") as stream:
        index = json.load(stream)
    try:
        result = evaluate_snapshot(collect_live(index) if args.live else index)
    except (KeyError, ValueError, RuntimeError, urllib.error.URLError) as error:
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
