import re

with open('client/src/pages/FactorResearch.tsx', 'r') as f:
    content = f.read()

# First, add Database, Layers, Sparkles to the lucide-react imports if they aren't there
lucide_import_match = re.search(r'import\s+\{([^}]+)\}\s+from\s+[\'"]lucide-react[\'"]', content)
if lucide_import_match:
    imports = lucide_import_match.group(1)
    for icon in ['Database', 'Layers', 'Sparkles', 'Activity', 'ShieldAlert', 'LineChart']:
        if icon not in imports:
            imports += f', {icon}'
    content = content[:lucide_import_match.start(1)] + imports + content[lucide_import_match.end(1):]
else:
    # If not present, add it after the antd import
    content = 'import { Database, Layers, Sparkles, Activity, ShieldAlert, LineChart as LucideLineChart } from "lucide-react";\n' + content

# Second, find the start of the return statement
return_start = content.find('  return (\n    <div>')
if return_start == -1:
    print("Could not find return statement")
else:
    new_return = """  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none">
          <Database className="w-64 h-64 text-indigo-400" />
        </div>
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl shadow-inner">
                <Layers className="w-6 h-6 text-indigo-400" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                量化与因子分析
                <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full text-xs font-mono font-bold tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> FACTOR ENGINE
                </span>
              </h1>
            </div>
            <p className="text-xs text-indigo-200/80 mt-1">
              基于 <strong className="text-white">高维异构因子矩阵</strong> 和 <strong className="text-white">深度IC序列跟踪</strong>，全方位提炼并监控 Alpha 收益。
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3 w-full lg:w-auto">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 text-center min-w-[95px]">
              <span className="text-[10px] text-slate-400 block font-medium">注册因子池</span>
              <span className="text-lg font-bold font-mono text-white mt-0.5">{vibeFactorTotal || Object.keys(factorDescriptions).length}</span>
            </div>
            <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl px-4 py-2.5 text-center min-w-[95px]">
              <span className="text-[10px] text-emerald-400 block font-medium">正收益因子</span>
              <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{positiveICCount}</span>
            </div>
            <div className="bg-indigo-950/30 border border-indigo-900/40 rounded-xl px-4 py-2.5 text-center min-w-[95px]">
              <span className="text-[10px] text-indigo-300 block font-medium">平均 IC</span>
              <span className="text-lg font-bold font-mono text-indigo-300 mt-0.5">{avgIC.toFixed(4)}</span>
            </div>
            <div className="bg-purple-950/30 border border-purple-900/40 rounded-xl px-4 py-2.5 text-center min-w-[95px]">
              <span className="text-[10px] text-purple-300 block font-medium">平均 IR</span>
              <span className="text-lg font-bold font-mono text-purple-300 mt-0.5">{avgIR.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <FullAnalysisPanel
        symbolInput={symbolInput}
        loading={analysisLoading}
        progress={analysisProgress}
        result={analysisResult}
        factorNameWithTip={factorNameWithTip}
        onSymbolInputChange={setSymbolInput}
        onAnalyze={handleFullAnalysis}
      />

      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl">
            <button
              onClick={() => {
                // If we need a state for sub tab we could use one, but it seems there was just antd Tabs.
                // We'll just replace Tabs with Antd Tabs styled with Tailwind for now, or just use the Antd Tabs as is, but without the Card wrapper.
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-indigo-600 text-white shadow-xs"
            >
              <Activity className="w-4 h-4" />
              因子矩阵分析
            </button>
          </div>
          
          <Space wrap>
            <Input.Search placeholder="搜索因子" allowClear style={{ width: 180 }}
              onSearch={v => setVibeFactorSearch(v)} className="dark-input" />
            <Select placeholder="筛选分类" allowClear style={{ width: 150 }}
              onChange={v => setSelectedVibeCategory(v || "")} value={selectedVibeCategory || undefined}
              className="dark-select">
              {vibeCategories.map(cat => (
                <Option key={cat} value={cat}>
                  {CATEGORY_CN_MAP[cat] || cat} ({vibeFactors.filter((f: FactorInfo) => f.category === cat).length})
                </Option>
              ))}
            </Select>
            <Divider orientation="vertical" className="bg-slate-700" />
            <Button icon={<ExportOutlined />} loading={exporting}
              onClick={() => handleExport()} className="bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500">
              批量导出
            </Button>
            <Upload accept=".factor-pack.json" showUploadList={false} maxCount={1}
              customRequest={({ file }) => handleImport(file as File)}>
              <Button icon={<ImportOutlined />} loading={importing} className="bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500">
                导入因子
              </Button>
            </Upload>
          </Space>
        </div>

        <Tabs defaultActiveKey="lifecycle_mining" onChange={(key) => {
          if (key === 'vibe') loadVibeData();
        }} items={[
          {
            label: "⚡ 因子自动挖掘与生命周期",
            key: "lifecycle_mining",
            children: <FactorLifecycleAndMining />
          },
          {
            label: "全频段计算与产业链",
            key: "live_factors",
            children: <LiveFactorsAndIndustry />
          },
          {
            label: "因子列表",
            key: "list",
            children: (
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
            )
          }
        ]} />
      </div>
    </div>
  );
}
"""
    # Find the end of the file
    content = content[:return_start] + new_return

with open('client/src/pages/FactorResearch.tsx', 'w') as f:
    f.write(content)

print("Replaced UI.")
