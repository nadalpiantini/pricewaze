import { SIGNAL_ICONS } from "./signalIcons";

export function buildSignalsPopup(signals: any[]) {
  if (!signals?.length) {
    return `<div class="text-sm text-gray-500">Sin señales</div>`;
  }

  return `
    <div style="display:flex; gap:8px; flex-wrap:wrap; max-width:220px">
      ${signals
        .map(
          (s: any) => `
        <div
          style="
            padding:4px 8px;
            border-radius:9999px;
            font-size:12px;
            background:${s.confirmed ? "#fee2e2" : "#f3f4f6"};
            border:1px solid ${s.confirmed ? "#fecaca" : "#e5e7eb"};
          "
          title="${s.confirmed ? "Confirmada" : "No confirmada"}"
        >
          ${SIGNAL_ICONS[s.signal_type] ?? "•"} ${Math.round(s.strength)}
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

