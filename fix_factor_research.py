import re

with open('client/src/pages/FactorResearch.tsx', 'r') as f:
    lines = f.readlines()

# 1. Find the start of the card "研究成果 → 候选策略闭环"
start_card = -1
end_card = -1
for i, line in enumerate(lines):
    if 'title="研究成果 → 候选策略闭环"' in line:
        # Go back to <Card
        for j in range(i, i-10, -1):
            if '<Card' in lines[j]:
                start_card = j
                break
        
        # Find closing </Card>
        open_tags = 0
        for j in range(start_card, len(lines)):
            if '<Card' in lines[j]:
                open_tags += 1
            if '</Card>' in lines[j]:
                open_tags -= 1
                if open_tags == 0:
                    end_card = j
                    break
        break

if start_card != -1 and end_card != -1:
    lines = lines[:start_card] + lines[end_card+1:]

# 2. Find the start of { label: "IC分析"
ic_start = -1
for i, line in enumerate(lines):
    if 'label: "IC分析"' in line:
        # Find the opening brace before it
        for j in range(i, i-5, -1):
            if '{' in lines[j]:
                ic_start = j
                break
        break

ic_end = -1
if ic_start != -1:
    # Find the end of the tabs array
    for i in range(len(lines)-1, -1, -1):
        if ']} />' in lines[i]:
            ic_end = i
            break

if ic_start != -1 and ic_end != -1:
    lines = lines[:ic_start] + lines[ic_end:]

with open('client/src/pages/FactorResearch.tsx', 'w') as f:
    f.writelines(lines)

