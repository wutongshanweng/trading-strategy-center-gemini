import re

with open('client/src/pages/FactorResearch.tsx', 'r') as f:
    content = f.read()

# Add activeTab state
state_injection = "  const [activeTab, setActiveTab] = useState<'lifecycle_mining' | 'live_factors' | 'list'>('lifecycle_mining');\n"
# Find a place to inject it (e.g. after const [loading, setLoading] = ...)
hook_match = re.search(r'const \[vibeLoading, setVibeLoading\] = useState\(false\);', content)
if hook_match:
    content = content[:hook_match.start()] + state_injection + content[hook_match.start():]
else:
    print("Could not find a place to inject state")

# Replace Tabs component
tabs_match = re.search(r'<Tabs defaultActiveKey="lifecycle_mining".*?items=\[\s*\{\s*label: "⚡ 因子自动挖掘与生命周期",\s*key: "lifecycle_mining",\s*children: <FactorLifecycleAndMining />\s*\},(.*?)\s*\]\}\s*/>', content, flags=re.DOTALL)
if tabs_match:
    print("Found tabs, proceeding to replace...")
    # It contains the three items.
    
    new_tabs = """<div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2 flex items-center justify-between overflow-x-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('lifecycle_mining')}
                className={`whitespace-nowrap px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'lifecycle_mining'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                ⚡ 因子自动挖掘与生命周期
              </button>
              <button
                onClick={() => setActiveTab('live_factors')}
                className={`whitespace-nowrap px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'live_factors'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Activity className="w-4 h-4" />
                全频段计算与产业链
              </button>
              <button
                onClick={() => {
                  setActiveTab('list');
                  loadVibeData();
                }}
                className={`whitespace-nowrap px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'list'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Database className="w-4 h-4" />
                因子列表库
              </button>
            </div>
          </div>

          <div className="mt-4">
            {activeTab === 'lifecycle_mining' && <FactorLifecycleAndMining />}
            {activeTab === 'live_factors' && <LiveFactorsAndIndustry />}
            {activeTab === 'list' && (
              <div className="mt-4">
                {vibeFactorTotal > 0 ? (
                  <Table
                    className="custom-dark-table"
                    size="small"
                    loading={vibeLoading}
                    dataSource={vibeFactors.filter((f: FactorInfo) => {
                      const matchSearch = !vibeFactorSearch ||
                        (f.name || "").toLowerCase().includes(vibeFactorSearch.toLowerCase()) ||
                        (f.description || "").toLowerCase().includes(vibeFactorSearch.toLowerCase()) ||
                        (f.category_cn || "").includes(vibeFactorSearch);
                      const matchCategory = !selectedVibeCategory || f.category === selectedVibeCategory;
                      return matchSearch && matchCategory;
                    })}
                    rowKey="name"
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 个因子`,
                    }}
                    scroll={{ x: 1000 }}
                    columns={[
                      { title: "因子名", dataIndex: "name", width: 120, fixed: "left" as const,
                        render: (v: string) => <Text code style={{ fontSize: 11, backgroundColor: 'transparent', color: '#e2e8f0', border: '1px solid #334155' }}>{v}</Text> },
                      { title: "分类", dataIndex: "category_cn", width: 90,
                        render: (v: string) => <Tag color={CATEGORY_COLORS[v] || "default"} style={{ fontWeight: "bold" }}>{v}</Tag> },
                      { title: "IC值", dataIndex: "ic", width: 90, sorter: (a: FactorInfo, b: FactorInfo) => a.ic - b.ic,
                        render: (v: number) => (
                          <Text style={{ color: v > 0 ? "#10b981" : "#ef4444", fontWeight: "bold" }}>
                            {v > 0 ? "+" : ""}{v.toFixed(4)}
                          </Text>
                        )
                      },
                      { title: "IR值", dataIndex: "ir", width: 80, sorter: (a: FactorInfo, b: FactorInfo) => a.ir - b.ir,
                        render: (v: number) => (
                          <Text style={{ color: v > 0.5 ? "#10b981" : v > 0 ? "#3b82f6" : "#ef4444", fontWeight: "bold" }}>
                            {v.toFixed(2)}
                          </Text>
                        )
                      },
                      { title: "风险调整收益", dataIndex: "risk_adj_return", width: 130,
                        sorter: (a: FactorInfo, b: FactorInfo) => a.risk_adj_return - b.risk_adj_return,
                        render: (v: number) => (
                          <Text style={{ color: v > 0 ? "#34d399" : "#f87171", fontWeight: "bold" }}>
                            {v > 0 ? "+" : ""}{v.toFixed(3)}
                          </Text>
                        )
                      },
                      { title: "描述", dataIndex: "description", ellipsis: true, render: (v: string) => <span className="text-slate-300">{v}</span> },
                      { title: "操作", key: "action", width: 60,
                        render: (_: unknown, r: FactorInfo) => (
                          <Tooltip title="导出为 .factor-pack.json">
                            <Button size="small" type="text" icon={<DownloadOutlined className="text-slate-400 hover:text-indigo-400" />}
                              onClick={() => handleExport(r.name)} loading={exporting} />
                          </Tooltip>
                        ) },
                    ]}
                  />
                ) : (
                  <Table
                    className="custom-dark-table"
                    dataSource={mockFactorList}
                    columns={factorColumns}
                    rowKey="id"
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 个因子`,
                    }}
                    size="middle"
                    scroll={{ x: 1000 }}
                  />
                )}
              </div>
            )}
          </div>
        </div>"""
    content = content[:tabs_match.start()] + new_tabs + content[tabs_match.end():]
else:
    print("Could not find Tabs to replace")

with open('client/src/pages/FactorResearch.tsx', 'w') as f:
    f.write(content)

