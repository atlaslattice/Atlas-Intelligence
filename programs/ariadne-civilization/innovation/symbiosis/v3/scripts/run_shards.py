#!/usr/bin/env python3
"""Execute the complete 12 × 144 × 1728 synthetic horizon matrix in bounded shards."""
import concurrent.futures, pathlib, subprocess, sys, time
root=pathlib.Path(__file__).resolve().parents[1]
source=root/'private-source/source-seeds.txt'
output=root/'reports/full'
output.mkdir(parents=True,exist_ok=True)
def run(h):
    binary=output/f'H{h:02d}.bin';jsonfile=output/f'H{h:02d}.json'
    p=subprocess.run([str(root/'bin/long_horizon'),str(source),str(h),'1728',str(binary),str(jsonfile)],capture_output=True,text=True,check=True)
    return h,p.stdout.strip(),binary.stat().st_size
start=time.monotonic()
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for h,message,nbytes in sorted(pool.map(run,range(1,13))):
        print(f'{message} bytes={nbytes:,}',flush=True)
print(f'ALL_12_SHARDS_EXECUTED elapsed_wall_seconds={time.monotonic()-start:.2f}',flush=True)
