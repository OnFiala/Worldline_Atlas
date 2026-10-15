// Presentation only: use stored evidence without changing records or their status.
export const esc = value => String(value ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const list = value => Array.isArray(value) ? value : [];
export const nodeTitle = (id, data) => text(data.nodes?.find(n => n.id === id)?.title) || text(id) || 'Not specified';
export function relatedEvents(r, data) {
  return list(data.events).filter(e => list(r.eventIds).includes(e.id) || list(e.relationIds).includes(r.id));
}
export function caseType(e) {
  if (['ongoing_context','ongoing_conflict_context'].includes(e.contextType)) return 'Ongoing context';
  if (e.contextType === 'dated_hazard_context') return 'Dated hazard context';
  const status = String(e.status ?? '').toLowerCase();
  if (/decision|announcement/.test(status)) return 'Dated decision';
  if (/estimate|observation|measurement/.test(status)) return 'Dated observation';
  if (/forecast/.test(status)) return 'External forecast';
  return 'Dated case';
}
export function explanation(record, data, kind = 'event') {
  const relation = kind === 'relation';
  const relations = relation ? [record] : list(data.relations).filter(r => list(record.relationIds).includes(r.id));
  const events = relation ? relatedEvents(record, data) : [record];
  const indicators = [...new Set(relations.flatMap(r => list(r.indicators).map(i => text(i.name)).filter(Boolean)))];
  return {
    whatHappened: text(record.whatHappened) || (relation
      ? events.slice(0, 2).map(e => text(e.publicationClaim) || text(e.summary) || e.title).join(' ') || 'No source-checked initiating case is linked yet. This is a possible mechanism to investigate.'
      : text(record.publicationClaim) || text(record.summary) || 'The event description has not been recorded.'),
    whyItMatters: text(record.whyItMatters) || (relation
      ? `Possible outcome: ${nodeTitle(record.toNode, data)}. Its size and who is exposed still need to be established.`
      : relations[0] ? `Possible outcome: ${nodeTitle(relations[0].toNode, data)}. The scale of the effect still needs a separate check.` : `This case concerns ${list(record.sectors).join(', ').toLowerCase() || 'people and places in this region'}. Wider effects must be checked separately from the event itself.`),
    howEffectsSpread: text(record.howEffectsSpread) || (relation ? text(record.mechanism) : text(relations[0]?.mechanism)) || 'No supported path from this case to a wider effect has been recorded yet.',
    whatToWatch: text(record.whatToWatch) || (indicators.length ? indicators.slice(0, 3).join('; ') + '.' : text(record.caution) || text(record.missingEvidence) || 'Look for a dated follow-up and evidence of who was affected. No measurable follow-up is specified yet.')
  };
}
export function renderExplanation(record, data, kind = 'event') {
  const copy = explanation(record, data, kind);
  return `<div class="plain-explanation">${[['whatHappened','What happened'],['whyItMatters','Why it matters'],['howEffectsSpread','How effects spread'],['whatToWatch','What to watch']].map(([key, title]) => `<section><h3>${title}${key === 'howEffectsSpread' ? '<span class="claim-kind">Possible effect</span>' : ''}</h3><p>${esc(copy[key])}</p></section>`).join('')}</div>`;
}
export function renderChain(r, data) {
  const edges = list(r.edges).length ? r.edges : [r];
  return `<ol class="plain-chain">${edges.map(edge => `<li><span class="chain-endpoint">${esc(nodeTitle(edge.fromNode, data))}</span><span class="chain-step"><b aria-hidden="true">↓</b> ${esc(edge.mechanism ?? r.mechanism)}</span><span class="chain-endpoint">${esc(nodeTitle(edge.toNode, data))}</span></li>`).join('')}</ol>`;
}
export function renderCoverage(data, expanded = false) {
  const events = list(data.events), candidates = list(data.watchlist);
  return `<details class="coverage-note" ${expanded ? 'open' : ''}><summary>Partial coverage · ${events.length} reviewed ${events.length===1?'case':'cases'}</summary><p>This is a selected research sample. Missing markers do not mean there is no crisis or disruption.</p><h3>Cases with reviewed evidence</h3><ul>${events.map(e => `<li>${esc(e.region)} — ${esc(e.title)} <small>(${esc(caseType(e))})</small></li>`).join('') || '<li>No case has completed evidence review.</li>'}</ul><h3>Still to verify · ${candidates.length}</h3><p>${candidates.map(e => esc(e.title)).join(' · ') || 'No stored candidates. This does not establish complete coverage.'}</p><h3>Ongoing context and gaps</h3><p>A dated incident or measurement does not describe an entire war, drought or recovery. Those longer developments require separate context and periodic review. Regions and topics outside the listed cases have not been systematically assessed here.</p><a href="/methodology#watchlist" data-route="/methodology#watchlist">Sources, candidates and research limits →</a></details>`;
}
