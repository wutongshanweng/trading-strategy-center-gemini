const fs = require('fs');
let content = fs.readFileSync('client/src/pages/FactorResearch.tsx', 'utf8');

// Match <Tabs defaultActiveKey="list" ... >
let tabsStartIdx = content.indexOf('<Tabs defaultActiveKey="list"');
let tabsEndIdx = content.indexOf('>', tabsStartIdx);
// But wait, there is a } inside onChange.
// Let's just find "}}>" manually.
let actualTabsEndIdx = content.indexOf('}}>', tabsStartIdx) + 2;

let tabsAttr = content.substring(tabsStartIdx, actualTabsEndIdx + 1);

let afterTabs = content.substring(actualTabsEndIdx + 1);
let endTabsIdx = afterTabs.lastIndexOf('</Tabs>');

let insideTabs = afterTabs.substring(0, endTabsIdx);
let rest = afterTabs.substring(endTabsIdx + 7); // length of </Tabs>

let itemsContent = insideTabs.replace(/<TabPane\s+tab="([^"]+)"\s+key="([^"]+)">/g, '{\n  label: "$1",\n  key: "$2",\n  children: (\n    <>');
itemsContent = itemsContent.replace(/<\/TabPane>/g, '    </>\n  )\n},');

let newTabs = tabsAttr.substring(0, tabsAttr.length - 1) + ' items={[\n' + itemsContent + '\n]} />';

content = content.substring(0, tabsStartIdx) + newTabs + rest;
content = content.replace(/const { TabPane } = Tabs;\n?/g, '');

fs.writeFileSync('client/src/pages/FactorResearch.tsx', content);
