"use client";
import Link from 'next/link';
import { useState } from 'react';
import { MessageCircleWarning, RefreshCw } from 'lucide-react';
import { useResource, useSubmission } from '@/lib/client';
import { complaintService as service, complaintLabels, categoryLabels } from '@/services/complaint-service';
import { date, money, shortId } from '@/lib/format';
import { financialStatus } from '@/lib/contracts.mjs';
import { DocumentView, Modal, PageTitle, Pagination, State } from './ui';
import type { PageProps } from './admin-app';

export function Complaints({ base, id }: PageProps & { id?: string }) {
  return id ? <ComplaintDetailPage key={id} base={base} id={id} /> : <ComplaintList base={base} />;
}
function ComplaintList({ base }: PageProps) {
  const [status, setStatus] = useState('open'); const [page, setPage] = useState(1);
  const query = useResource(service.list(status, page));
  return <>
    <PageTitle title="Khiếu nại booking" description="Đối chiếu bằng chứng, phản hồi của MUA và xử lý quyền lợi khách hàng" action={<button className="button secondary" onClick={query.reload}><RefreshCw size={16} />Làm mới</button>} />
    <div className="panel complaint-panel"><div className="complaint-toolbar"><label>Trạng thái <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="open">Đang xử lý</option><option value="">Tất cả</option>{Object.entries(complaintLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><span>{query.data?.total || 0} hồ sơ</span></div>
      {query.loading || query.error || !query.data?.items.length ? <State loading={query.loading} error={query.error} retry={query.reload} empty="Chưa có khiếu nại" /> : <div className="table-wrap"><table><thead><tr><th>Hồ sơ / Booking</th><th>Khách hàng</th><th>MUA</th><th>Vấn đề</th><th>Trạng thái</th><th>Ngày gửi</th><th /></tr></thead><tbody>{query.data.items.map(item => <tr key={item.id}><td><strong>KN-{shortId(item.id)}</strong><div className="muted">BK-{shortId(item.bookingId)}</div></td><td>{item.customerName}</td><td>{item.muaName}</td><td>{categoryLabels[item.category] || item.category}</td><td><span className={`complaint-status ${item.isOpen ? 'open' : ''}`}>{complaintLabels[item.status] || item.status}</span></td><td>{date(item.createdAt)}</td><td><Link className="text-button" href={`${base}/complaints/${item.id}`}>Xem hồ sơ →</Link></td></tr>)}</tbody></table></div>}
      <Pagination page={page} size={20} count={query.data?.items.length || 0} total={query.data?.total} onPage={setPage} server />
    </div>
  </>;
}
function ComplaintDetailPage({ base, id }: PageProps & { id: string }) {
  const query = useResource(service.detail(id)); const submission = useSubmission();
  const [reason, setReason] = useState(''); const [amount, setAmount] = useState(''); const [action, setAction] = useState('Review');
  const [note, setNote] = useState(''); const [internal, setInternal] = useState(true); const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false); const [notice, setNotice] = useState('');
  const c = query.data;
  function validate() {
    setError('');
    if (!reason.trim()) { setError('Cần nhập lý do hoặc nội dung yêu cầu bổ sung.'); return false; }
    if (action === 'Refund' && (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > (c?.paidAmount || 0))) { setError('Số tiền hoàn phải lớn hơn 0 và không vượt khoản đã thanh toán.'); return false; }
    if (action === 'Refund' && c?.needsFinancialReconciliation) { setError('Cần đối soát khoản chi trả trước khi tạo hoàn tiền.'); return false; }
    return true;
  }
  async function saveAction() {
    if (!validate() || !submission.begin()) return;
    try { await service.action(id, { action, reason: reason.trim(), refundAmount: action === 'Refund' ? Number(amount) : undefined }); setConfirm(false); setReason(''); setNotice('Đã cập nhật hồ sơ và thông báo cho hai bên.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Chưa lưu được quyết định.'); setConfirm(false); }
    finally { submission.end(); }
  }
  async function saveNote() {
    if (!note.trim() || !submission.begin()) return;
    setError('');
    try { await service.message(id, note.trim(), internal); setNote(''); setNotice(internal ? 'Đã lưu ghi chú nội bộ.' : 'Đã gửi phản hồi cho hai bên.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Chưa gửi được phản hồi.'); }
    finally { submission.end(); }
  }
  if (query.loading || query.error || !c) return <State loading={query.loading} error={query.error} retry={query.reload} />;
  return <>
    <Link className="text-button" href={`${base}/complaints`}>← Danh sách khiếu nại</Link>
    <PageTitle title={`Khiếu nại KN-${shortId(c.id)}`} description={`Booking BK-${shortId(c.bookingId)} • ${date(c.createdAt)}`} action={<button className="button secondary" onClick={query.reload}><RefreshCw size={16} />Làm mới</button>} />
    {!!notice && <div className="notice success" role="status">{notice}</div>}
    {!!error && <div className="notice error" role="alert">{error}</div>}
    <div className="complaint-grid">
      <section className="panel complaint-panel"><h2>Thông tin hồ sơ</h2><span className={`complaint-status ${c.isOpen ? 'open' : ''}`}>{complaintLabels[c.status]}</span><dl className="complaint-facts"><dt>Khách hàng</dt><dd>{c.booking.customerName}</dd><dt>Makeup Artist</dt><dd>{c.booking.muaName}</dd><dt>Vấn đề</dt><dd>{categoryLabels[c.category]}</dd><dt>Tổng giá trị booking</dt><dd>{money(c.booking.totalAmount)}</dd><dt>Thanh toán qua B-Book</dt><dd>{money(c.paidAmount)}</dd><dt>Mong muốn</dt><dd>{c.requestedOutcome === 'Support' ? 'Hỗ trợ giải quyết' : c.requestedOutcome === 'FullRefund' ? 'Hoàn toàn bộ khoản đã thanh toán' : 'Hoàn một phần'}{c.requestedAmount != null ? ` • ${money(c.requestedAmount)}` : ''}</dd><dt>Hạn phản hồi đề xuất</dt><dd>{date(c.responseDeadline)}</dd></dl>
        <p className="complaint-body">{c.description}</p>
        {c.needsFinancialReconciliation && <div className="notice warning"><MessageCircleWarning size={18} />Khoản thu đã hoặc đang chi trả. Cần đối soát trước khi chấp nhận hoàn tiền.</div>}
        {c.decisionReason && <div className="notice neutral"><strong>Quyết định Admin</strong><p className="complaint-body">{c.decisionReason}</p></div>}
        {c.refund && <div className="notice neutral"><strong>Khoản hoàn {money(c.refund.amount)}</strong><p>{financialStatus(c.refund.status, true) === 'Completed' ? 'Đã hoàn tiền' : 'Đã có quyết định; khoản hoàn đang được xử lý'}</p><Link className="text-button" href={`${base}/refunds/${c.refund.refundId}`}>Xử lý hồ sơ hoàn tiền →</Link></div>}
      </section>
      <section className="panel complaint-panel"><h2>Lịch sử & Bằng chứng</h2><div className="complaint-timeline">{c.messages.map(message => <article key={message.id} className="complaint-event"><div className="complaint-toolbar"><strong>{message.authorRole === 'Customer' ? 'Khách hàng' : message.authorRole === 'MUA' ? 'Makeup Artist' : 'Admin'} {message.internal && <span className="complaint-status">Nội bộ</span>}</strong><small>{date(message.createdAt)}</small></div><p className="complaint-body">{message.body}</p><div className="complaint-evidence">{message.imageUrls.map((url, index) => <DocumentView key={`${message.id}-${index}`} url={url} label={`Bằng chứng ${index + 1}`} />)}</div></article>)}</div></section>
    </div>
    {c.isOpen && <div className="complaint-grid">
      <section className="panel complaint-panel"><h2>Ghi chú / Phản hồi</h2><textarea disabled={submission.busy} maxLength={2000} value={note} onChange={event => setNote(event.target.value)} placeholder="Nhập ghi chú hoặc phản hồi..." /><label className="complaint-check"><input type="checkbox" checked={internal} disabled={submission.busy} onChange={event => setInternal(event.target.checked)} />Chỉ admin nhìn thấy (ghi chú nội bộ)</label><button className="button secondary" disabled={submission.busy || !note.trim()} onClick={saveNote}>{internal ? 'Lưu ghi chú' : 'Gửi phản hồi'}</button></section>
      <section className="panel complaint-panel"><h2>Xử lý khiếu nại</h2><label>Thao tác<select disabled={submission.busy} value={action} onChange={event => setAction(event.target.value)}><option value="Review">Bắt đầu xem xét</option><option value="RequestCustomer">Yêu cầu khách bổ sung</option><option value="RequestMua">Yêu cầu MUA phản hồi</option><option value="Reject">Kết thúc / Không chấp nhận hoàn tiền</option><option value="Refund" disabled={c.needsFinancialReconciliation}>Chấp nhận hoàn tiền</option></select></label>
        {action === 'Refund' && <><label>Số tiền hoàn (VND)<input type="text" inputMode="numeric" disabled={submission.busy} value={amount} onChange={event => setAmount(event.target.value.replace(/\D/g, ''))} maxLength={12} /></label><p className="muted">Tối đa {money(c.paidAmount)}. Quyết định tạo hồ sơ hoàn tiền, chưa xác nhận đã chuyển tiền.</p></>}
        <label>Lý do / Nội dung yêu cầu<textarea disabled={submission.busy} maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} placeholder="Nêu rõ căn cứ xử lý để hai bên theo dõi..." /></label><button className="button primary" disabled={submission.busy || !reason.trim()} onClick={() => { if (validate()) { if (action === 'Refund' || action === 'Reject') setConfirm(true); else void saveAction(); } }}>Lưu xử lý</button>
      </section>
    </div>}
    {confirm && <Modal title="Xác nhận quyết định khiếu nại" onClose={() => { if (!submission.busy) setConfirm(false); }}><p>{action === 'Refund' ? `Chấp nhận hoàn ${money(Number(amount))} cho khách hàng.` : 'Kết thúc hồ sơ và không tạo khoản hoàn tiền.'}</p><p className="complaint-body">Lý do: {reason}</p><p>Quyết định được lưu trong lịch sử và gửi thông báo cho hai bên.</p><div className="complaint-toolbar"><button className="button secondary" disabled={submission.busy} onClick={() => setConfirm(false)}>Quay lại</button><button className="button primary" disabled={submission.busy} onClick={saveAction}>{submission.busy ? 'Đang lưu...' : 'Xác nhận quyết định'}</button></div></Modal>}
  </>;
}
