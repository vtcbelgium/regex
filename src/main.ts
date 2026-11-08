// src/main.ts
// UI orchestrator for Regex Tester & Visual Explainer

import { processInput, getPresets, applyPreset } from './tool.ts';
import { initTheme } from './theme.ts';
import { initModals } from './modals.ts';
import { showToast } from './toast.ts';
import { auditCookies } from './cookies.ts';
import { auditVault } from './vault.ts';

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderOutput(output: string, warnings?: string[]): void {
  const outputRegion = document.getElementById('output-region');
  if (!outputRegion) return;
  
  let html = `<pre><code>${escapeHtml(output)}</code></pre>`;
  
  if (warnings && warnings.length > 0) {
    html += `<div class="warnings" style="margin-top: 1rem; padding: 0.75rem; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">
      <strong>Warnings:</strong><ul style="margin: 0.5rem 0 0 1.5rem;">
      ${warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
      </ul>
    </div>`;
  }
  
  outputRegion.innerHTML = html;
}

function renderError(error: string): void {
  const outputRegion = document.getElementById('output-region');
  if (!outputRegion) return;
  outputRegion.innerHTML = `<pre class="error" style="color: #dc3545;">${escapeHtml(error)}</pre>`;
}

function populatePresets(): void {
  const select = document.getElementById('preset-select') as HTMLSelectElement;
  if (!select) return;
  
  const presets = getPresets();
  for (const [key, value] of Object.entries(presets)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = key.charAt(0).toUpperCase() + key.slice(1);
    select.appendChild(option);
  }
}

function handlePresetChange(): void {
  const select = document.getElementById('preset-select') as HTMLSelectElement;
  const input = document.getElementById('app-input') as HTMLTextAreaElement;
  if (!select || !input) return;
  
  const presetName = select.value;
  if (!presetName) return;
  
  const preset = applyPreset(presetName);
  if (preset) {
    const parts = [];
    if (preset.pattern) parts.push(preset.pattern);
    if (preset.flags) parts.push(preset.flags);
    if (preset.testString) parts.push(preset.testString);
    input.value = parts.join('|');
    select.value = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initModals();
  auditCookies();
  auditVault();
  populatePresets();
  
  const inputEl = document.getElementById('app-input') as HTMLTextAreaElement;
  const processBtn = document.getElementById('action-process') as HTMLButtonElement;
  const clearBtn = document.getElementById('action-clear') as HTMLButtonElement;
  const copyBtn = document.getElementById('action-copy') as HTMLButtonElement;
  const presetSelect = document.getElementById('preset-select') as HTMLSelectElement;
  
  if (processBtn) {
    processBtn.addEventListener('click', () => {
      const input = inputEl?.value.trim() || '';
      if (!input) {
        showToast('Please enter input');
        return;
      }
      
      const res = processInput(input);
      if (res.success) {
        renderOutput(res.data, res.warnings);
        showToast('Completed successfully!');
      } else {
        renderError(res.error || 'Processing failed');
        showToast('Error: ' + (res.error || 'Processing failed'));
      }
    });
  }
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (inputEl) inputEl.value = '';
      const outputRegion = document.getElementById('output-region');
      if (outputRegion) outputRegion.innerHTML = '<p class="placeholder">Output will appear here...</p>';
      if (presetSelect) presetSelect.value = '';
      showToast('Cleared');
    });
  }
  
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const outputRegion = document.getElementById('output-region');
      if (!outputRegion) return;
      
      const text = outputRegion.textContent || '';
      if (!text.trim() || text.includes('Output will appear here')) {
        showToast('Nothing to copy');
        return;
      }
      
      try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!');
      } catch {
        showToast('Failed to copy');
      }
    });
  }
  
  if (presetSelect) {
    presetSelect.addEventListener('change', handlePresetChange);
  }
});

