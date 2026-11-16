/**
 * admin 화면에 연락처를 다 보이지 않게 — 관리자도 연락처 전체가 필요한 화면이 아니다.
 * 공유 성과(/api/admin/referrals) · 자격증 목록(/api/admin/licenses) 이 함께 쓴다.
 */
export function maskEmail(e?: string | null) {
  if (!e) return null;
  const [id, host] = e.split("@");
  if (!host) return null;
  return `${id.slice(0, 2)}${"*".repeat(Math.max(1, id.length - 2))}@${host}`;
}

export function maskPhone(p?: string | null) {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  return d.length >= 8 ? `${d.slice(0, 3)}-****-${d.slice(-4)}` : null;
}
