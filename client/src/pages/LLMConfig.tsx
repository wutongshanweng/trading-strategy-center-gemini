import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, Key, Server, Cpu, CheckCircle2, 
  AlertTriangle, ShieldCheck, RefreshCw, Plus, Edit, 
  Trash2, Play, Sparkles, Zap, Lock, Eye, EyeOff, 
  Terminal, ArrowRight, Layers, Sliders, Check, Search,
  Image, Video, FileText, Globe, Wand2, Filter, X
} from 'lucide-react';
import { message, Modal, Form, Input, Select, Button, Tag, Tooltip, Switch } from 'antd';
import { llmIntegration } from '../services/tradingCenterClient';
import { LLMModelSelector } from '../components/LLMModelSelector';

export interface DiscoveredModelItem {
  id: string;
  name: string;
  category: 'text' | 'vision' | 'multimodal' | 'video' | 'embedding';
  category_label: string;
  description: string;
  context_window?: string;
  supports_vision_kline?: boolean;
}

export interface ProviderItem {
  id: string;
  name: string;
  provider_type: string;
  api_url: string;
  api_key_preview: string;
  model: string;
  available_models: string[];
  is_active: boolean;
  status: 'online' | 'offline' | 'untested';
  latency_ms?: number;
  updated_at?: string;
}

export interface UseCaseItem {
  use_case: string;
  name: string;
  description: string;
  default_provider_id: string;
  default_model: string;
  temperature: number;
}

export function LLMConfig() {
  const [activeTab, setActiveTab] = useState<'providers' | 'use_cases' | 'playground'>('providers');
  
  // Providers & Use Cases 状态
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [useCases, setUseCases] = useState<UseCaseItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal 状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [showFullKeyInEdit, setShowFullKeyInEdit] = useState(false);
  const [discoveringModels, setDiscoveringModels] = useState(false);
  
  // 发现的模型与当前可用模型池状态
  const [discoveredModels, setDiscoveredModels] = useState<DiscoveredModelItem[]>([]);
  const [availableModelsList, setAvailableModelsList] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [newCustomModelText, setNewCustomModelText] = useState<string>('');
  
  // Modal Form
  const [form] = Form.useForm();

  // Test Modal
  const [testResultModal, setTestResultModal] = useState<{
    open: boolean;
    loading: boolean;
    data?: any;
  }>({ open: false, loading: false });

  // Playground 状态
  const [taskType, setTaskType] = useState<string>('market_analysis');
  const [taskSymbol, setTaskSymbol] = useState<string>('RB2609');
  const [taskPrompt, setTaskPrompt] = useState<string>('根据最新的多因子模型与缠论形态，分析螺纹钢主力合约的阻力位与支撑位');
  const [selectedTaskProvider, setSelectedTaskProvider] = useState<string>('');
  const [selectedTaskModel, setSelectedTaskModel] = useState<string>('gemini-2.5-flash');
  const [runningTask, setRunningTask] = useState(false);
  const [taskResult, setTaskResult] = useState<any>(null);

  // 加载列表数据
  const loadData = async () => {
    setLoading(true);
    try {
      const [provRes, ucRes] = await Promise.all([
        llmIntegration.providers().catch(() => null),
        llmIntegration.useCases().catch(() => null)
      ]);

      if (provRes?.data?.providers) {
        setProviders(provRes.data.providers);
        if (!selectedTaskProvider && provRes.data.providers.length > 0) {
          const activeProv = provRes.data.providers.find((p: any) => p.is_active) || provRes.data.providers[0];
          setSelectedTaskProvider(activeProv.id);
        }
      }

      if (ucRes?.data?.use_cases) {
        setUseCases(ucRes.data.use_cases);
      }
    } catch {
      message.error('载入 LLM 配置信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 打开创建 Modal
  const handleOpenCreateModal = () => {
    setEditingProviderId(null);
    setShowFullKeyInEdit(false);
    setDiscoveredModels([]);
    setCategoryFilter('all');
    setNewCustomModelText('');
    setAvailableModelsList(['agnes-2.5-flash', 'agnes-2.0-flash']);
    setIsModalOpen(true);
    setTimeout(() => {
      form.resetFields();
      form.setFieldsValue({
        provider_type: 'agnes',
        name: 'Agnes AI 智能端点',
        api_url: 'https://apihub.agnes-ai.com/v1',
        model: 'agnes-2.5-flash',
        is_active: true
      });
    }, 0);
  };

  // 打开编辑 Modal
  const handleOpenEditModal = async (id: string) => {
    setEditingProviderId(id);
    setShowFullKeyInEdit(false);
    setDiscoveredModels([]);
    setCategoryFilter('all');
    setNewCustomModelText('');
    message.loading({ content: '正在加载密钥与接口配置...', key: 'loadEdit' });
    try {
      const res = await llmIntegration.editable(id);
      message.destroy('loadEdit');
      if (res?.data?.provider) {
        const p = res.data.provider;
        const initialModels = p.available_models && p.available_models.length > 0 
          ? p.available_models 
          : [p.model || 'gemini-2.5-flash'];
        setAvailableModelsList(initialModels);
        setIsModalOpen(true);
        setTimeout(() => {
          form.setFieldsValue({
            name: p.name,
            provider_type: p.provider_type,
            api_url: p.api_url,
            api_key: p.api_key, // 仅在编辑详情中展示
            model: p.model,
            is_active: p.is_active
          });
        }, 0);
      }
    } catch {
      message.destroy('loadEdit');
      message.error('无法读取 Provider 编辑详情');
    }
  };

  // 保存（创建/修改）Provider
  const handleSaveProvider = async () => {
    try {
      const values = await form.validateFields();
      const currentSelectedModel = values.model;
      const combinedAvailableModels = Array.from(
        new Set([currentSelectedModel, ...availableModelsList].filter(Boolean))
      );

      if (editingProviderId) {
        // 修改
        await llmIntegration.update(editingProviderId, {
          name: values.name,
          provider_type: values.provider_type,
          api_url: values.api_url,
          api_key: values.api_key, // 未传或留空会被后端按规范保留旧值
          model: currentSelectedModel,
          available_models: combinedAvailableModels,
          is_active: values.is_active
        });
        message.success('Provider 配置已更新');
      } else {
        // 新建
        await llmIntegration.createProvider({
          ...values,
          available_models: combinedAvailableModels
        });
        message.success('新 Provider 创建成功');
      }
      setIsModalOpen(false);
      loadData();
    } catch {
      // 表单校验失败或 API 报错
    }
  };

  // 尝试在线查找/发现模型（支持分类与形态识别）
  const handleDiscoverModels = async () => {
    const providerType = form.getFieldValue('provider_type');
    const apiUrl = form.getFieldValue('api_url');
    const apiKey = form.getFieldValue('api_key');
    const currentModel = form.getFieldValue('model');

    setDiscoveringModels(true);
    try {
      const res = await llmIntegration.discoverModels({
        provider_type: providerType,
        api_url: apiUrl,
        api_key: apiKey,
        model: currentModel
      });

      if (res?.data?.model_details && Array.isArray(res.data.model_details)) {
        setDiscoveredModels(res.data.model_details);
        const discoveredIds = res.data.model_details.map((m: any) => m.id);
        
        // 自动合并到可用模型池中
        setAvailableModelsList(prev => Array.from(new Set([...prev, ...discoveredIds])));
        
        const summary = res.data.summary;
        message.success(
          `发现 ${res.data.model_details.length} 个模型 (含 ${summary?.vision_models || 0} 个K线视觉识别模型、${summary?.multimodal_models || 0} 个多模态模型)`
        );

        if (discoveredIds.length > 0 && (!currentModel || !discoveredIds.includes(currentModel))) {
          form.setFieldsValue({ model: discoveredIds[0] });
        }
      } else if (res?.data?.models && Array.isArray(res.data.models)) {
        const simpleList = res.data.models;
        setAvailableModelsList(prev => Array.from(new Set([...prev, ...simpleList])));
        message.success(`已发现 ${simpleList.length} 个可用模型`);
      }
    } catch {
      message.warning('探索模型请求超时，已为您呈现内置全景模型');
    } finally {
      setDiscoveringModels(false);
    }
  };

  // 添加自定义模型
  const handleAddCustomModel = () => {
    const trimmed = newCustomModelText.trim();
    if (!trimmed) return;
    if (!availableModelsList.includes(trimmed)) {
      setAvailableModelsList(prev => [...prev, trimmed]);
      message.success(`已添加模型 [${trimmed}] 到可用模型列表`);
    }
    setNewCustomModelText('');
  };

  // 移除可用模型
  const handleRemoveAvailableModel = (modelToRemove: string) => {
    if (availableModelsList.length <= 1) {
      message.warning('至少需要保留一个可用模型');
      return;
    }
    const updated = availableModelsList.filter(m => m !== modelToRemove);
    setAvailableModelsList(updated);
    if (form.getFieldValue('model') === modelToRemove) {
      form.setFieldsValue({ model: updated[0] });
    }
  };

  // 快捷切换主推模型
  const handleSelectDefaultModel = (modelId: string) => {
    form.setFieldsValue({ model: modelId });
    if (!availableModelsList.includes(modelId)) {
      setAvailableModelsList(prev => [...prev, modelId]);
    }
    message.info(`已设置【${modelId}】为默认主选模型`);
  };

  // 删除 Provider
  const handleDeleteProvider = (id: string, name: string) => {
    Modal.confirm({
      title: '确认删除 LLM 提供商？',
      content: `即将删除 ${name}，如已有场景依赖该模型，删除后将自动回退到默认 Gemini 端点。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await llmIntegration.deleteProvider(id);
          message.success('已安全移除该 Provider');
          loadData();
        } catch {
          message.error('删除操作失败');
        }
      }
    });
  };

  // 激活 Provider
  const handleActivateProvider = async (id: string) => {
    try {
      await llmIntegration.activate(id);
      message.success('Provider 激活成功');
      loadData();
    } catch {
      message.error('激活失败');
    }
  };

  // 测试 Provider 模型效果
  const handleTestProvider = async (id: string) => {
    setTestResultModal({ open: true, loading: true });
    try {
      const res = await llmIntegration.test(id, { prompt: '进行系统握手与基准响应测试' });
      setTestResultModal({ open: true, loading: false, data: res.data });
      loadData();
    } catch {
      setTestResultModal({ 
        open: true, 
        loading: false, 
        data: { error: '连接测试失败，请检查 Base URL 与 API Key 是否有效。' } 
      });
    }
  };

  // 绑定 Use Case 的默认 Provider
  const handleSetUseCaseDefault = async (useCaseKey: string, providerId: string) => {
    try {
      await llmIntegration.setDefaultUseCase(useCaseKey, { provider_id: providerId });
      message.success('场景默认 LLM 设置成功');
      loadData();
    } catch {
      message.error('更换场景 Provider 失败');
    }
  };

  // 运行 Playground Task
  const handleRunTask = async () => {
    setRunningTask(true);
    setTaskResult(null);
    try {
      const res = await llmIntegration.runTask({
        task_type: taskType,
        symbol: taskSymbol,
        prompt: taskPrompt,
        provider_id: selectedTaskProvider,
        model: selectedTaskModel
      });
      setTaskResult(res.data);
      message.success(`LLM 推理任务已由 [${selectedTaskModel}] 执行完毕`);
    } catch {
      message.error('运行 LLM 任务失败');
    } finally {
      setRunningTask(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* 1. Top Header Banner & Safety Constraints */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/90 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none">
          <BrainCircuit className="w-64 h-64 text-indigo-400" />
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl shadow-inner">
                <BrainCircuit className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                  LLM 架构与模型配置中心 (LLM Engine Management)
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 rounded-full text-xs font-mono font-bold tracking-widest flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> SECURE PROXY
                  </span>
                </h1>
                <p className="text-xs text-indigo-200/80 mt-1">
                  管理 Gemini、DeepSeek、OpenAI 及自定义模型节点，为市场宏观分析、交易计划与策略优化分配算法算力。
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreateModal}
              className="bg-indigo-600 hover:bg-indigo-500 border-none font-bold shadow-lg shadow-indigo-600/30"
            >
              新建 LLM Provider
            </Button>
          </div>
        </div>

        {/* Security Boundaries Alert Bar */}
        <div className="mt-5 pt-4 border-t border-indigo-500/20 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-white">严格安全边界限制：</strong> 列表默认全路径仅暴露 <code className="text-emerald-300 font-mono">api_key_preview</code> 脱敏密钥。未传 Key 更新时保留原有加密状态，杜绝前端明文泄漏。
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            环境节点：Node.js ESM Gateway
          </span>
        </div>
      </div>

      {/* 2. Main Navigation Tabs */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'providers'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Server className="w-4 h-4 text-amber-400" />
            提供商与模型管理 ({providers.length})
          </button>

          <button
            onClick={() => setActiveTab('use_cases')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'use_cases'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            应用场景路由配置 ({useCases.length})
          </button>

          <button
            onClick={() => setActiveTab('playground')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'playground'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            LLM 任务测试控制台
          </button>
        </div>

        <Button
          type="text"
          icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          onClick={loadData}
          className="text-slate-400 hover:text-white"
        >
          刷新
        </Button>
      </div>

      {/* TAB 1: LLM Provider 列表与管理 */}
      {activeTab === 'providers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((p) => {
            return (
              <div
                key={p.id}
                className={`bg-slate-900/50 border rounded-2xl p-5 flex flex-col justify-between transition-all relative overflow-hidden group ${
                  p.is_active 
                    ? 'border-indigo-500/70 shadow-lg shadow-indigo-950/40 bg-gradient-to-b from-slate-900 via-indigo-950/20 to-slate-900' 
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top Badge & Status */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Tag color={
                        p.provider_type === 'gemini' ? 'gold' :
                        p.provider_type === 'deepseek' ? 'cyan' :
                        p.provider_type === 'openai' ? 'green' : 'purple'
                      } className="font-mono uppercase text-[10px] font-bold">
                        {p.provider_type}
                      </Tag>

                      {p.is_active ? (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 已激活默认
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px]">
                          备选节点
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-slate-400 font-mono">
                      {p.latency_ms ? `${p.latency_ms}ms` : '未测试'}
                    </span>
                  </div>

                  {/* Title & Model */}
                  <h3 className="text-base font-bold text-white tracking-tight mb-1 group-hover:text-indigo-300 transition-colors">
                    {p.name}
                  </h3>
                  
                  <div className="text-xs text-indigo-300 font-mono font-bold mb-4 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                    当前选用模型: <span className="text-white">{p.model}</span>
                  </div>

                  {/* Details Box */}
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2.5 text-xs font-mono mb-5">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>API Endpoint:</span>
                      <span className="text-slate-300 truncate max-w-[180px]">{p.api_url}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>API Key 预览:</span>
                      <span className="text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                        {p.api_key_preview}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-cyan-400" />
                          已绑定的模型集合 ({p.available_models?.length || 1}):
                        </span>
                        <span className="text-[10px] text-slate-500">点击标签切换生效模型</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {(p.available_models || [p.model]).map((m) => {
                          const isSelected = p.model === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (isSelected) return;
                                try {
                                  await llmIntegration.update(p.id, { model: m });
                                  message.success(`已将 ${p.name} 的生效模型切换为 ${m}`);
                                  loadData();
                                } catch {
                                  message.error('切换模型失败');
                                }
                              }}
                              className={`text-[11px] px-2 py-0.5 rounded transition-all font-mono flex items-center gap-1 border ${
                                isSelected
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500 shadow-sm shadow-emerald-500/20 font-bold'
                                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-200'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <Button
                    size="small"
                    icon={<Play className="w-3 h-3" />}
                    onClick={() => handleTestProvider(p.id)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs"
                  >
                    测试响应
                  </Button>

                  <div className="flex items-center gap-1">
                    {!p.is_active && (
                      <Button
                        size="small"
                        onClick={() => handleActivateProvider(p.id)}
                        className="bg-indigo-950 text-indigo-300 border-indigo-800 hover:bg-indigo-900 text-xs"
                      >
                        启用
                      </Button>
                    )}

                    <Button
                      size="small"
                      icon={<Edit className="w-3 h-3" />}
                      onClick={() => handleOpenEditModal(p.id)}
                      className="text-slate-400 hover:text-white border-slate-700 text-xs"
                    />

                    <Button
                      size="small"
                      danger
                      icon={<Trash2 className="w-3 h-3" />}
                      onClick={() => handleDeleteProvider(p.id, p.name)}
                      className="border-slate-700 text-xs"
                    />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: 用途与应用场景绑定 */}
      {activeTab === 'use_cases' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                各量化计算场景默认 LLM Provider 路由映射
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                当系统执行宏观分析、交易计划推演或策略生成时，将自动分发任务至对应的已配置 LLM 端点。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {useCases.map((uc) => {
              return (
                <div key={uc.use_case} className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {uc.name}
                        <code className="text-[10px] text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40 font-mono">
                          {uc.use_case}
                        </code>
                      </h4>
                      <Tag color="blue" className="font-mono text-[10px]">
                        Temp: {uc.temperature}
                      </Tag>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                      {uc.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-slate-800/60">
                    <span className="text-xs text-slate-400 shrink-0">绑定默认 Provider:</span>
                    <Select
                      value={uc.default_provider_id}
                      onChange={(val) => handleSetUseCaseDefault(uc.use_case, val)}
                      style={{ flex: 1 }}
                      options={providers.map(p => ({
                        label: `${p.name} (${p.model})`,
                        value: p.id
                      }))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: LLM 任务测试控制台 (Playground) */}
      {activeTab === 'playground' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Controls */}
          <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
              <Terminal className="w-4 h-4 text-emerald-400" />
              测试任务配置参数
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">目标任务类型 (Task Type):</label>
                <Select
                  value={taskType}
                  onChange={setTaskType}
                  style={{ width: '100%' }}
                  options={[
                    { label: '市场宏观研判 (market_analysis)', value: 'market_analysis' },
                    { label: '交易计划推演 (trading_plan)', value: 'trading_plan' },
                    { label: '跨资产联动分析 (cross_asset)', value: 'cross_asset' },
                    { label: '回测报告解读 (backtest_explain)', value: 'backtest_explain' },
                    { label: '量化策略代码生成 (strategy_generate)', value: 'strategy_generate' },
                    { label: '信号解析 (signal_explain)', value: 'signal_explain' }
                  ]}
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-mono">目标标的代码 (Symbol):</label>
                <Input
                  value={taskSymbol}
                  onChange={e => setTaskSymbol(e.target.value)}
                  placeholder="如 RB2609, IF2609, M2609"
                  className="bg-slate-950 border-slate-800 text-white font-mono"
                />
              </div>

              {/* 统一 LLM Provider & Model 选择器 */}
              <LLMModelSelector
                selectedProviderId={selectedTaskProvider}
                selectedModel={selectedTaskModel}
                onProviderChange={(provId, prov) => {
                  setSelectedTaskProvider(provId);
                  const m = prov.model || prov.available_models?.[0] || 'gemini-2.5-flash';
                  setSelectedTaskModel(m);
                }}
                onModelChange={(m) => setSelectedTaskModel(m)}
                mode="compact"
                className="bg-slate-950 border-slate-800"
                label="选择测试执行 Provider 节点与模型"
              />

              <div>
                <label className="text-slate-400 block mb-1">用户指令 Prompt:</label>
                <Input.TextArea
                  rows={4}
                  value={taskPrompt}
                  onChange={e => setTaskPrompt(e.target.value)}
                  placeholder="输入自定义测试 Prompt..."
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <Button
                type="primary"
                block
                icon={<Play className={`w-4 h-4 ${runningTask ? 'animate-spin' : ''}`} />}
                onClick={handleRunTask}
                loading={runningTask}
                className="bg-emerald-600 hover:bg-emerald-500 border-none font-bold py-2 h-auto"
              >
                运行统一 LLM 任务推演
              </Button>
            </div>
          </div>

          {/* Right Console Result Output */}
          <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  模型推理 Console 输出结果
                </h3>
                {taskResult && (
                  <Tag color="green" className="font-mono text-[10px]">
                    200 OK
                  </Tag>
                )}
              </div>

              {taskResult ? (
                <div className="space-y-3 font-mono text-xs">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-slate-400 text-[11px]">【归因概览】</div>
                    <p className="text-indigo-300 font-bold">{taskResult.result?.summary}</p>

                    <div className="text-slate-400 text-[11px] pt-2">【推演逻辑说明】</div>
                    <p className="text-slate-200 leading-relaxed">{taskResult.result?.details}</p>

                    <div className="text-slate-400 text-[11px] pt-2">【风险评价与动作】</div>
                    <div className="flex items-center gap-3 pt-1">
                      <Tag color="orange">{taskResult.result?.risk_rating}</Tag>
                      <Tag color="cyan">{taskResult.result?.recommended_action}</Tag>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-[11px]">
                    <span className="text-slate-500 block mb-1">完整 JSON 响应结构:</span>
                    <pre className="text-emerald-400 overflow-x-auto p-2 bg-slate-900 rounded">
                      {JSON.stringify(taskResult, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <Terminal className="w-10 h-10 opacity-30" />
                  <p className="text-xs">点击左侧“运行统一 LLM 任务推演”测试模型响应</p>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-500 border-t border-slate-800/60 pt-3 flex items-center justify-between">
              <span>统一接口: POST /api/v1/llm/tasks/run</span>
              <span>安全规范: 不将敏感Key上报日志</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Provider 新建/编辑 Modal 弹窗 */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-white font-bold">
            <Key className="w-4 h-4 text-indigo-400" />
            {editingProviderId ? '编辑 LLM Provider 配置' : '新建 LLM Provider 节点'}
          </div>
        }
        open={isModalOpen}
        onOk={handleSaveProvider}
        onCancel={() => setIsModalOpen(false)}
        okText="保存配置"
        cancelText="取消"
        className="dark-modal"
        width={740}
        forceRender
      >
        <Form form={form} layout="vertical" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="name"
              label="Provider 端点名称"
              rules={[{ required: true, message: '请输入名称' }]}
            >
              <Input placeholder="如：Agnes AI 智能端点 / DeepSeek R1" className="bg-slate-950 text-white" />
            </Form.Item>

            <Form.Item
              name="provider_type"
              label="提供商类型 (Provider Type)"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: 'Agnes AI (Agnes 2.5 Flash / 2.0)', value: 'agnes' },
                  { label: 'Google Gemini (3.7 Flash / 3.1 Pro)', value: 'gemini' },
                  { label: 'DeepSeek (R1 / V3 / Coder)', value: 'deepseek' },
                  { label: 'OpenAI (GPT-4o / o1 / o3)', value: 'openai' },
                  { label: 'Anthropic Claude (3.5 Sonnet)', value: 'claude' },
                  { label: '自定义 OpenAI 兼容 API', value: 'custom' },
                ]}
                onChange={(type) => {
                  if (type === 'agnes') {
                    form.setFieldsValue({
                      name: form.getFieldValue('name') || 'Agnes AI 智能端点',
                      api_url: 'https://apihub.agnes-ai.com/v1',
                      model: 'agnes-2.5-flash'
                    });
                    setAvailableModelsList(['agnes-2.5-flash', 'agnes-2.0-flash', 'agnes-vision-kline']);
                  } else if (type === 'gemini') {
                    form.setFieldsValue({
                      name: form.getFieldValue('name') || 'Google Gemini 3.7',
                      api_url: 'https://generativelanguage.googleapis.com/v1beta',
                      model: 'gemini-3.7-flash'
                    });
                    setAvailableModelsList(['gemini-3.7-flash', 'gemini-3.1-pro-preview', 'gemini-3.1-flash-lite', 'gemini-2.0-flash']);
                  } else if (type === 'deepseek') {
                    form.setFieldsValue({
                      name: form.getFieldValue('name') || 'DeepSeek 专属节点',
                      api_url: 'https://api.deepseek.com/v1',
                      model: 'deepseek-reasoner'
                    });
                    setAvailableModelsList(['deepseek-reasoner', 'deepseek-chat', 'deepseek-coder']);
                  } else if (type === 'openai') {
                    form.setFieldsValue({
                      name: form.getFieldValue('name') || 'OpenAI 企业节点',
                      api_url: 'https://api.openai.com/v1',
                      model: 'gpt-4o'
                    });
                    setAvailableModelsList(['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o3-mini']);
                  } else if (type === 'claude') {
                    form.setFieldsValue({
                      name: form.getFieldValue('name') || 'Anthropic Claude 节点',
                      api_url: 'https://api.anthropic.com/v1',
                      model: 'claude-3-5-sonnet-20241022'
                    });
                    setAvailableModelsList(['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022']);
                  }
                }}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="api_url"
              label="API Base URL Endpoint"
              rules={[{ required: true, message: '请输入 API 端点地址' }]}
              extra={<span className="text-[11px] text-slate-500">提示：Agnes AI 请填 https://apihub.agnes-ai.com/v1</span>}
            >
              <Input 
                placeholder="https://apihub.agnes-ai.com/v1 或 https://api.openai.com/v1" 
                className="bg-slate-950 text-white font-mono text-xs"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && val.toLowerCase().includes('agnes')) {
                    if (form.getFieldValue('provider_type') !== 'agnes') {
                      form.setFieldsValue({ provider_type: 'agnes' });
                    }
                    if (!form.getFieldValue('model') || form.getFieldValue('model') === 'gemini-2.5-flash' || form.getFieldValue('model') === 'gpt-4o') {
                      form.setFieldsValue({ model: 'agnes-2.5-flash' });
                    }
                  }
                }}
              />
            </Form.Item>

            <Form.Item
              name="api_key"
              label={
                <span className="flex items-center justify-between w-full">
                  <span>API Secret Key {editingProviderId && <span className="text-slate-400 font-normal">(若不修改请留空)</span>}</span>
                  <button
                    type="button"
                    onClick={() => setShowFullKeyInEdit(!showFullKeyInEdit)}
                    className="text-indigo-400 text-xs flex items-center gap-1 hover:text-indigo-300 ml-4"
                  >
                    {showFullKeyInEdit ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showFullKeyInEdit ? '隐藏' : '显示完整 Key'}
                  </button>
                </span>
              }
            >
              <Input
                type={showFullKeyInEdit ? 'text' : 'password'}
                placeholder={editingProviderId ? '留空表示保留原保存的 API Key' : '输入 Key 例如 sk-xxxx'}
                className="bg-slate-950 text-white font-mono text-xs"
              />
            </Form.Item>
          </div>

          {/* 默认主选模型与一键发现 */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3 mb-4">
            <div className="flex items-center gap-3">
              <Form.Item
                name="model"
                label={<span className="text-white font-bold flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-indigo-400" /> 当前默认主选模型 (Default Model)</span>}
                rules={[{ required: true, message: '请输入或选择模型代号' }]}
                className="flex-1 mb-0"
              >
                <Input placeholder="agnes-2.5-flash" className="bg-slate-900 text-emerald-300 font-mono font-bold" />
              </Form.Item>

              <Button
                type="primary"
                icon={<Search className="w-3.5 h-3.5" />}
                onClick={handleDiscoverModels}
                loading={discoveringModels}
                className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white text-xs shadow-md shadow-indigo-600/30"
              >
                探索发现可用模型
              </Button>
            </div>

            {/* 当前端点激活的可用模型池 (Available Models Pool) */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  已启用可用模型池 (点击切换默认模型，支持选择 2.0 / 2.5 / 视觉K线等):
                </span>
                <span className="text-[11px] text-slate-500">{availableModelsList.length} 个可用</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {availableModelsList.map((m) => {
                  const isCurrent = form.getFieldValue('model') === m;
                  return (
                    <div
                      key={m}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all border ${
                        isCurrent
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500 shadow-sm shadow-emerald-500/20 font-bold'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500 cursor-pointer'
                      }`}
                    >
                      <span 
                        onClick={() => handleSelectDefaultModel(m)} 
                        className="cursor-pointer flex items-center gap-1"
                        title="点击设为默认主推模型"
                      >
                        {isCurrent && <Check className="w-3 h-3 text-emerald-400" />}
                        {m}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAvailableModel(m);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                        title="从可用列表中移除"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}

                {/* 快速添加自定义模型输入框 */}
                <div className="inline-flex items-center gap-1 bg-slate-900/90 px-2 py-0.5 rounded-lg border border-dashed border-slate-700">
                  <Input
                    placeholder="+ 自定义模型名"
                    value={newCustomModelText}
                    onChange={(e) => setNewCustomModelText(e.target.value)}
                    onPressEnter={handleAddCustomModel}
                    className="bg-transparent text-xs text-white border-0 p-0 w-28 font-mono focus:shadow-none"
                  />
                  <Button
                    type="text"
                    size="small"
                    onClick={handleAddCustomModel}
                    className="text-slate-400 hover:text-emerald-400 p-0 h-auto text-xs"
                  >
                    添加
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* 发现模型全景矩阵 (支持视觉/K线图像、多模态、文本推理筛选与选择) */}
          {discoveredModels.length > 0 && (
            <div className="bg-slate-950/90 p-4 rounded-xl border border-indigo-900/40 space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">模型能力全景矩阵 (点击卡片直接选定)</span>
                </div>

                {/* 分类过滤器 */}
                <div className="flex items-center gap-1">
                  {[
                    { key: 'all', label: '全部' },
                    { key: 'vision', label: '👁️ K线视觉' },
                    { key: 'multimodal', label: '🌐 多模态' },
                    { key: 'text', label: '📝 文本推理' },
                    { key: 'video', label: '🎬 视频' },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setCategoryFilter(tab.key)}
                      className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${
                        categoryFilter === tab.key
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {discoveredModels
                  .filter(m => categoryFilter === 'all' || m.category === categoryFilter)
                  .map((m) => {
                    const isSelectedAsDefault = form.getFieldValue('model') === m.id;

                    return (
                      <div
                        key={m.id}
                        onClick={() => handleSelectDefaultModel(m.id)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between text-left ${
                          isSelectedAsDefault
                            ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-600 hover:bg-slate-900'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                              {isSelectedAsDefault && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                              {m.id}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                              m.category === 'vision' ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50' :
                              m.category === 'multimodal' ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/50' :
                              m.category === 'video' ? 'bg-purple-950/80 text-purple-300 border border-purple-800/50' :
                              'bg-slate-800 text-slate-300'
                            }`}>
                              {m.category_label}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                            {m.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-800/60 text-[10px]">
                          <span className="text-slate-500 font-mono">上下文: {m.context_window || '512K'}</span>
                          <div className="flex items-center gap-1.5">
                            {isSelectedAsDefault ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> 当前默认
                              </span>
                            ) : (
                              <span className="text-indigo-400 hover:underline">设为默认</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <Form.Item name="is_active" valuePropName="checked">
            <Switch checkedChildren="激活默认" unCheckedChildren="备选" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 4. 测试响应结果 Modal 弹窗 */}
      <Modal
        title="LLM 模型握手与效果测试结果"
        open={testResultModal.open}
        onOk={() => setTestResultModal({ open: false, loading: false })}
        onCancel={() => setTestResultModal({ open: false, loading: false })}
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        {testResultModal.loading ? (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
            <p className="text-xs text-slate-400">正在与服务端及 LLM 远端 Endpoint 进行 TLS 握手握握与基准测试...</p>
          </div>
        ) : testResultModal.data?.error ? (
          <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-2">
            <div className="text-rose-400 font-bold text-xs flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> 测试失败
            </div>
            <p className="text-xs text-slate-300">{testResultModal.data.error}</p>
          </div>
        ) : (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span>节点名称: <strong className="text-white">{testResultModal.data?.provider_name}</strong></span>
              <span>响应延时: <strong className="text-emerald-400">{testResultModal.data?.latency_ms}ms</strong></span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="text-slate-500 text-[10px]">模型生成内容:</div>
              <p className="text-slate-200 font-sans leading-relaxed">{testResultModal.data?.completion}</p>
            </div>

            {testResultModal.data?.usage && (
              <div className="text-[10px] text-slate-500 flex items-center justify-between">
                <span>Prompt Tokens: {testResultModal.data.usage.prompt_tokens}</span>
                <span>Completion Tokens: {testResultModal.data.usage.completion_tokens}</span>
                <span>Total: {testResultModal.data.usage.total_tokens}</span>
              </div>
            )}
          </div>
        )}
      </Modal>

    </div>
  );
}

export const LLMConfigPage = LLMConfig;
