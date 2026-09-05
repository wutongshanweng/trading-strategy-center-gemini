import React, { useState, useEffect } from 'react';
import { Sparkles, BrainCircuit, RefreshCw, Cpu, CheckCircle2, Edit3, Sliders } from 'lucide-react';
import { message, Tooltip } from 'antd';
import { llmIntegration } from '../services/tradingCenterClient';

export interface LLMProviderOption {
  id: string;
  name: string;
  provider_type: string;
  model: string;
  available_models: string[];
  is_active: boolean;
  status: string;
}

interface LLMModelSelectorProps {
  selectedProviderId?: string;
  selectedModel?: string;
  onProviderChange?: (providerId: string, provider: LLMProviderOption) => void;
  onModelChange?: (model: string) => void;
  mode?: 'full' | 'compact' | 'inline';
  className?: string;
  label?: string;
  showCustomInput?: boolean;
  onlyActive?: boolean;
}

export function LLMModelSelector({
  selectedProviderId,
  selectedModel,
  onProviderChange,
  onModelChange,
  mode = 'full',
  className = '',
  label = 'AI 大模型推理节点选择',
  showCustomInput = true,
  onlyActive = true
}: LLMModelSelectorProps) {
  const [providers, setProviders] = useState<LLMProviderOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [internalProviderId, setInternalProviderId] = useState<string>(selectedProviderId || '');
  const [internalModel, setInternalModel] = useState<string>(selectedModel || '');
  const [isCustomModelInput, setIsCustomModelInput] = useState(false);
  const [customModelText, setCustomModelText] = useState('');

  const currentProviderId = selectedProviderId !== undefined ? selectedProviderId : internalProviderId;
  const currentModel = selectedModel !== undefined ? selectedModel : internalModel;

  // 根据 onlyActive 过滤激活节点
  const activeProviders = providers.filter(p => p.is_active);
  const displayProviders = onlyActive
    ? (activeProviders.length > 0 ? activeProviders : providers)
    : providers;

  const fetchProviders = async (isManual = false) => {
    setLoading(true);
    try {
      const res: any = await llmIntegration.providers();
      const list = res?.data?.providers || res?.providers || [];
      if (Array.isArray(list) && list.length > 0) {
        setProviders(list);

        const activeList = onlyActive ? list.filter((p: any) => p.is_active) : list;
        const targetList = activeList.length > 0 ? activeList : list;

        // 如果当前选中的 provider 不在有效列表中，选中第一个有效激活的
        let activeProv = targetList.find((p: any) => p.id === currentProviderId);
        if (!activeProv) {
          activeProv = targetList.find((p: any) => p.is_active) || targetList[0];
          if (activeProv) {
            setInternalProviderId(activeProv.id);
            const defaultM = activeProv.model || activeProv.available_models?.[0] || 'gemini-3.7-flash';
            setInternalModel(defaultM);
            onProviderChange?.(activeProv.id, activeProv);
            onModelChange?.(defaultM);
          }
        }
      }
      if (isManual) {
        message.success('LLM 模型端点列表已同步更新');
      }
    } catch {
      if (isManual) message.error('同步 LLM 端点失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders(false);
  }, []);

  // 当外部传入变化时同步
  useEffect(() => {
    if (selectedProviderId) setInternalProviderId(selectedProviderId);
    if (selectedModel) setInternalModel(selectedModel);
  }, [selectedProviderId, selectedModel]);

  const handleProviderSelect = (provId: string) => {
    setInternalProviderId(provId);
    const prov = providers.find(p => p.id === provId);
    if (prov) {
      const targetModel = prov.model || prov.available_models?.[0] || 'gemini-3.7-flash';
      setInternalModel(targetModel);
      setIsCustomModelInput(false);
      onProviderChange?.(provId, prov);
      onModelChange?.(targetModel);
    }
  };

  const handleModelSelect = (modelVal: string) => {
    if (modelVal === '__custom__') {
      setIsCustomModelInput(true);
      setCustomModelText(currentModel);
    } else {
      setIsCustomModelInput(false);
      setInternalModel(modelVal);
      onModelChange?.(modelVal);
    }
  };

  const handleCustomModelApply = () => {
    if (!customModelText.trim()) {
      message.warning('请输入有效的自定义模型标识');
      return;
    }
    setInternalModel(customModelText.trim());
    onModelChange?.(customModelText.trim());
    message.success(`已设定自定义模型: ${customModelText.trim()}`);
  };

  const activeProvider = displayProviders.find(p => p.id === currentProviderId) || displayProviders[0];
  
  // 计算当前 Provider 下所有可选模型（包含 default model 和 available_models，去重）
  const availableModelsList = Array.from(new Set([
    ...(activeProvider?.model ? [activeProvider.model] : []),
    ...(activeProvider?.available_models || []),
    ...(currentModel ? [currentModel] : [])
  ])).filter(Boolean);

  if (mode === 'inline' || mode === 'compact') {
    return (
      <div className={`flex flex-wrap items-center gap-2 bg-slate-950/80 border border-slate-800/90 px-3 py-1.5 rounded-xl ${className}`}>
        <div className="flex items-center gap-1.5 text-xs text-slate-300 shrink-0">
          <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-[11px]">AI 模型:</span>
        </div>

        {/* 提供商下拉（仅展示激活的 LLM 节点） */}
        <select
          value={currentProviderId}
          onChange={(e) => handleProviderSelect(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] font-bold text-indigo-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          {displayProviders.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* 模型下拉 / 自定义输入 */}
        {!isCustomModelInput ? (
          <select
            value={currentModel}
            onChange={(e) => handleModelSelect(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {availableModelsList.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
            {showCustomInput && <option value="__custom__">+ 手动指定自定义模型...</option>}
          </select>
        ) : (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={customModelText}
              onChange={(e) => setCustomModelText(e.target.value)}
              placeholder="输入自定义模型如 qwen-2.5"
              className="bg-slate-900 border border-cyan-500/80 rounded-lg px-2 py-1 text-[11px] font-mono text-cyan-200 w-32 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleCustomModelApply()}
            />
            <button
              onClick={handleCustomModelApply}
              className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold cursor-pointer"
            >
              确定
            </button>
            <button
              onClick={() => setIsCustomModelInput(false)}
              className="text-[10px] text-slate-400 hover:text-white px-1 cursor-pointer"
            >
              取消
            </button>
          </div>
        )}

        <Tooltip title="同步最新 LLM 模型配置">
          <button
            onClick={() => fetchProviders(true)}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-indigo-300 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </Tooltip>
      </div>
    );
  }

  // Full 完整卡片模式 (用于 AI 深度投研与任务台)
  return (
    <div className={`bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3.5 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-200">{label}</span>
          {activeProvider?.is_active && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              已激活生效中
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-300 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-md">
            已激活 {displayProviders.length} 个端点
          </span>
          <button
            onClick={() => fetchProviders(true)}
            disabled={loading}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 px-2 py-0.5 rounded-md transition-all cursor-pointer"
            title="刷新端点状态"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
            <span>选择 LLM 提供商 (Provider)</span>
            <span className="text-[10px] text-slate-500 font-mono">{activeProvider?.provider_type?.toUpperCase()}</span>
          </label>
          <select
            value={currentProviderId}
            onChange={(e) => handleProviderSelect(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-bold text-indigo-300 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            {displayProviders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-medium text-slate-400">选择推理模型 (Model)</label>
            {showCustomInput && !isCustomModelInput && (
              <button
                type="button"
                onClick={() => {
                  setIsCustomModelInput(true);
                  setCustomModelText(currentModel);
                }}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-2.5 h-2.5" />
                自定义模型名称
              </button>
            )}
          </div>

          {!isCustomModelInput ? (
            <select
              value={currentModel}
              onChange={(e) => handleModelSelect(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
            >
              {availableModelsList.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              {showCustomInput && <option value="__custom__">+ 手动输入自定义模型名称...</option>}
            </select>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={customModelText}
                onChange={(e) => setCustomModelText(e.target.value)}
                placeholder="例如：deepseek-ai/DeepSeek-V3"
                className="flex-1 px-3 py-2 bg-slate-950 border border-cyan-500/80 rounded-xl text-xs font-mono font-bold text-cyan-200 focus:outline-none focus:border-cyan-400"
                onKeyDown={(e) => e.key === 'Enter' && handleCustomModelApply()}
              />
              <button
                type="button"
                onClick={handleCustomModelApply}
                className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                应用
              </button>
              <button
                type="button"
                onClick={() => setIsCustomModelInput(false)}
                className="px-2 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LLMModelSelector;
