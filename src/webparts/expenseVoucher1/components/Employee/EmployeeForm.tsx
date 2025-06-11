import * as React from 'react';
import { useEffect, useState } from 'react';
import { SPFI, spfi } from '@pnp/sp';
import { SPFx } from '@pnp/sp/presets/all';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/site-users';
import { MSGraphClientV3 } from '@microsoft/sp-http';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Modal, Button } from 'react-bootstrap';
import Tesseract from 'tesseract.js';
interface IExpenseVoucherProps {
  context: any;
  onBack: () => void;
  goToMyRequests: () => void;
  editItemId: number | null;
  fromMyRequests?: boolean;
}

const EmployeeForm: React.FC<IExpenseVoucherProps> = ({
  context,
  onBack,
  goToMyRequests,
  editItemId,
  fromMyRequests = false,
}) => {
  const [sp, setSp] = useState<SPFI>();
  const [employeeInfo, setEmployeeInfo] = useState<{ Id: number; Title: string }>({ Id: 0, Title: '' });
  const [rmInfo, setRmInfo] = useState<{ Id: number; Title: string }>({ Id: 0, Title: '' });
  const [department, setDepartment] = useState('');
  const [expenseItems, setExpenseItems] = useState([{ head: '', description: '', date: new Date().toISOString().split('T')[0], amount: '', image: ''}]);
  const [projectOptions, setProjectOptions] = useState<{ Id: number; Title: string }[]>([]);
  const [currencyOptions, setCurrencyOptions] = useState<string[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [isProjectRelatedOptions, setIsProjectRelatedOptions] = useState<string[]>([]);
  const [isProjectRelated, setIsProjectRelated] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [employeeComment, setEmployeeComment] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().substring(0, 10));
  const [saving, setSaving] = useState(false);
  const [expenseHeads, setExpenseHeads] = useState<string[]>([]);
  const [managerComment, setManagerComment] = useState('');
  const [accountComment, setAccountComment] = useState('');
  const [status, setStatus] = useState('');
  //const [imageSrc, setImageSrc] = useState<string | null>(null);
  // const [amount, setAmount] = useState('');
  // const [formattedDate, setFormattedDate] = useState('');
  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'Draft' | 'Pending with Manager'>('Draft');

  useEffect(() => {
    const spInstance = spfi().using(SPFx(context));
    setSp(spInstance);
    loadInitialData(spInstance);
    if (editItemId) {
      loadEditData(spInstance, editItemId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editItemId]);

  const loadInitialData = async (sp: SPFI) => {
    try {
      const [user, currencies, isProjects, projects, expenseCategories] = await Promise.all([
        sp.web.currentUser(),
        sp.web.lists.getByTitle('ExpenseTransaction').fields.getByInternalNameOrTitle('Currency')(),
        sp.web.lists.getByTitle('ExpenseTransaction').fields.getByInternalNameOrTitle('IsProjectRelated')(),
        sp.web.lists.getByTitle('Projects').items.select('Id', 'Title')(),
        sp.web.lists.getByTitle('ExpenseCategories').items.select('Title')()
      ]);

      const userDetails = await sp.web.siteUsers.getById(user.Id)();
      const client = await context.msGraphClientFactory.getClient('3') as MSGraphClientV3;
      const profile = await client.api('/me?$select=department').get();
      const managerGraph = await client.api('/me/manager').get();
      const managerUser = await sp.web.siteUsers.getByEmail(managerGraph.mail)();

      setEmployeeInfo({ Id: userDetails.Id, Title: userDetails.Title });
      setDepartment(profile.department || '');
      setRmInfo({ Id: managerUser.Id, Title: managerUser.Title });
      setCurrencyOptions(currencies?.Choices || []);
      setIsProjectRelatedOptions(isProjects?.Choices || []);
      setProjectOptions(projects || []);
      setExpenseHeads(expenseCategories.map(cat => cat.Title));
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load initial data.');
    }
  };

  const loadEditData = async (sp: SPFI, itemId: number) => {
    try {
      const item = await sp.web.lists.getByTitle('ExpenseTransaction').items.getById(itemId).select(
        'Currency',
        'IsProjectRelated',
        'EmployeeComment',
        'Date',
        'ExpenseItems',
        'ProjectId',
        'ManagerComment',
        'AccountComment',
        'Status'
      )();

      setSelectedCurrency(item.Currency || '');
      setIsProjectRelated(item.IsProjectRelated || '');
      setEmployeeComment(item.EmployeeComment || '');
      setVoucherDate(item.Date || new Date().toISOString().substring(0, 10));
      setExpenseItems(JSON.parse(item.ExpenseItems || '[]') || []);
      if (item.IsProjectRelated === 'Yes') {
        setSelectedProject(item.ProjectId?.toString() || '');
      }

      setManagerComment(item.ManagerComment || '');
      setAccountComment(item.AccountComment || '');
      setStatus(item.Status || '');
    } catch (error) {
      console.error('Error loading item for edit:', error);
      alert('Failed to load item for editing.');
    }
  };

  const handleExpenseItemChange = (index: number, field: string, value: string) => {
    const updated = [...expenseItems];
    updated[index] = { ...updated[index], [field]: value };
    setExpenseItems(updated);
  };

  const addExpenseItem = () => {
    setExpenseItems([...expenseItems, { head: '', description: '', date: new Date().toISOString().substring(0, 10), amount: '', image: '' }]);
  };

  const removeExpenseItem = (index: number) => {
    setExpenseItems(expenseItems.filter((_, i) => i !== index));
  };

  const totalAmount = expenseItems.reduce((sum, item) => {
    const amt = parseFloat(item.amount);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  // Show modal on submit button click
  const onSubmitClick = (statusToSave: 'Draft' | 'Pending with Manager') => {
    setSubmitStatus(statusToSave);
    setShowConfirmModal(true);
  };

  // Confirm and save
  const confirmSave = async () => {
    setShowConfirmModal(false);
    if (!sp) return;

    if (!selectedCurrency || !isProjectRelated || expenseItems.some(i => !i.head || !i.amount)) {
      alert('Please fill all required fields.');
      return;
    }

    setSaving(true);
    try {
      const itemPayload: any = {
        Title: 'Expense Voucher',
        EmployeeNameId: employeeInfo.Id,
        Department: department,
        RmNameId: rmInfo.Id,
        Currency: selectedCurrency,
        IsProjectRelated: isProjectRelated,
        TotalAmount: totalAmount,
        Status: submitStatus,
        EmployeeComment: employeeComment,
        Date: voucherDate,
        ExpenseItems: JSON.stringify(expenseItems)
      };

      if (isProjectRelated === 'Yes' && selectedProject) {
        itemPayload.ProjectId = parseInt(selectedProject);
      }

      if (editItemId) {
        await sp.web.lists.getByTitle('ExpenseTransaction').items.getById(editItemId).update(itemPayload);
        alert('Form updated successfully');
      } else {
        await sp.web.lists.getByTitle('ExpenseTransaction').items.add(itemPayload);
        alert(`Form saved as ${submitStatus}`);
      }
      resetForm();
    } catch (error: any) {
      alert(`Error saving form: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
  };
const extractAmount = (text: string): string => {
    const lines = text.split('\n').map(line => line.trim().toLowerCase());
    const amountRegex = /\b\d{1,3}(?:[,\s]?\d{3})*(?:\.\d{2})\b/g;
    const keywords = ['total', 'amount', 'paid', 'net', 'bill'];
    const candidates: { value: number; weight: number }[] = [];

    for (const line of lines) {
      const matches = line.match(amountRegex);
      if (matches) {
        for (const raw of matches) {
          if (/\d\s+\d/.test(raw)) continue;
          const cleaned = raw.replace(/[, ]/g, '');
          const num = parseFloat(cleaned);
          if (!isNaN(num) && num >= 1 && num <= 50000) {
            const weight = keywords.some(k => line.includes(k)) ? 10 : 1;
            candidates.push({ value: num, weight });
          }
        }
      }
    }

    if (candidates.length === 0) return '';
    candidates.sort((a, b) => b.weight - a.weight || b.value - a.value);
    return candidates[0].value.toFixed(2);
  };

  const extractDate = (text: string): string => {
    text = text.replace(/\bhug\b/gi, 'Aug'); // OCR correction

    const patterns = [
      /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g,
      /\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/g,
      /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*|\s+)?\d{2,4}\b/gi,
    ];

    for (const regex of patterns) {
      const match = text.match(regex);
      if (match?.length) {
        const rawDate = match[0].replace(/,/g, '').trim();
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) {
        const yyyy = parsed.getFullYear();
        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
        const dd = String(parsed.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`; // ✅ Format for input type="date"
      }
      }
    }

    return 'Not Found';
  };
  const extractTextFromImage = async (imageBase64: string): Promise<string> => {
    try {
      const {
        data: { text },
      } = await Tesseract.recognize(imageBase64, 'eng');
      return text;
    } catch (error) {
      console.error('OCR Error:', error);
      return '';
    }
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    const imageDataUrl = reader.result as string;

    const extractedText = await extractTextFromImage(imageDataUrl); // OCR logic
    const extractedAmount = extractAmount(extractedText);
    const extractedDate = extractDate(extractedText);

    setExpenseItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        amount: extractedAmount || '',
        date: extractedDate ,
        image: imageDataUrl // <--- NEW: store image for this row
      };
      return updated;
    });
  };

  reader.readAsDataURL(file);
};



const resetForm = () => {
    setSelectedProject('');
    setSelectedCurrency('');
    setIsProjectRelated('');
    setEmployeeComment('');
    setExpenseItems([{ head: '', description: '', date: new Date().toISOString().substring(0, 10), amount: '' ,  image: ''}]);
    setVoucherDate(new Date().toISOString().substring(0, 10));
    setManagerComment('');
    setAccountComment('');
    setStatus('');
  };
  return (
  <div className="container mt-3 mb-5">
    <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
      <button className="btn btn-link text-primary" onClick={onBack}>&larr; Back</button>
      <h4 className="mb-2 mb-md-0">{editItemId ? 'Edit Expense Voucher' : 'New Expense Voucher'}</h4>
      <button className="btn btn-outline-primary" onClick={goToMyRequests}>My Requests</button>
    </div>

    <div className="row gx-3 gy-3">
      <div className="col-12 col-md-4">
        <label className="form-label">Employee Name</label>
        <input className="form-control" value={employeeInfo.Title} readOnly />
      </div>
      <div className="col-12 col-md-4">
        <label className="form-label">Department</label>
        <input className="form-control" value={department} readOnly />
      </div>
      <div className="col-12 col-md-4">
        <label className="form-label">Reporting Manager</label>
        <input className="form-control" value={rmInfo.Title} readOnly />
      </div>
    </div>

    <div className="row gx-3 gy-3 mt-3">
      <div className="col-12 col-md-4">
        <label className="form-label">
          Date <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          type="date"
          className="form-control"
          value={voucherDate}
          onChange={e => setVoucherDate(e.target.value)}
          disabled={!!editItemId}
        />
      </div>
      <div className="col-12 col-md-4">
        <label className="form-label">
          Currency <span style={{ color: 'red' }}>*</span>
        </label>
        <select
          className="form-select"
          value={selectedCurrency}
          onChange={e => setSelectedCurrency(e.target.value)}
        >
          <option value="">Select Currency</option>
          {currencyOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="col-12 col-md-4">
        <label className="form-label">
          Is Project Related? <span style={{ color: 'red' }}>*</span>
        </label>
        <select
          className="form-select"
          value={isProjectRelated}
          onChange={e => setIsProjectRelated(e.target.value)}
        >
          <option value="">Select Option</option>
          {isProjectRelatedOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    </div>

    {isProjectRelated === 'Yes' && (
      <div className="row mt-3">
        <div className="col-12 col-md-6">
          <label className="form-label">Project</label>
          <select
            className="form-select"
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
          >
            <option value="">Select Project</option>
            {projectOptions.map(proj => (
              <option key={proj.Id} value={proj.Id}>{proj.Title}</option>
            ))}
          </select>
        </div>
      </div>
    )}

    <div className="mt-4">
      <h5>Expense Items</h5>
      {expenseItems.map((item, idx) => (
  <div key={idx} className="row gy-2 align-items-center mb-2">
    {/* Head */}
    <div className="col-12 col-md-3">
      <select
        className="form-select"
        value={item.head}
        onChange={e => handleExpenseItemChange(idx, 'head', e.target.value)}
      >
        <option value="">Expense Head</option>
        {expenseHeads.map(head => (
          <option key={head} value={head}>{head}</option>
        ))}
      </select>
    </div>

    {/* Description */}
    <div className="col-12 col-md-3">
      <input
        className="form-control"
        placeholder="Description"
        value={item.description}
        onChange={e => handleExpenseItemChange(idx, 'description', e.target.value)}
      />
    </div>

    {/* Date */}
    <div className="col-12 col-md-2">
      <input
        type="date"
        className="form-control"
        value={item.date}
        onChange={e => handleExpenseItemChange(idx, 'date', e.target.value)}
      />
    </div>

    {/* Amount */}
    <div className="col-10 col-md-2">
      <input
        type="number"
        min="0"
        className="form-control"
        placeholder="Amount"
        value={item.amount}
        onChange={e => handleExpenseItemChange(idx, 'amount', e.target.value)}
      />
    </div>

    {/* Upload & Remove */}
    <div className="col-2 col-md-2 text-end d-flex justify-content-end align-items-center gap-2">
  <input
    type="file"
    accept="image/*"
    capture="environment"
    style={{ display: 'none' }}
    id={`uploadInput-${idx}`}
    onChange={e => handleImageUpload(e, idx)}
  />

  {/* Upload Button */}
  <button
    type="button"
    className="btn btn-sm btn-primary"
    onClick={() => document.getElementById(`uploadInput-${idx}`)?.click()}
    title="Upload"
  >
    📁
  </button>

  {/* Remove Button */}
  {expenseItems.length > 1 && (
    <button
      className="btn btn-sm btn-danger"
      onClick={() => removeExpenseItem(idx)}
      title="Remove"
    >
      &times;
    </button>
  )}
</div>


    {/* Optional: Image Preview */}
    {item.image && (
      <div className="col-12">
        <img
          src={item.image}
          alt="Receipt"
          style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '5px' }}
        />
      </div>
    )}
  </div>
))}
<button className="btn btn-outline-secondary btn-sm mb-4" onClick={addExpenseItem}>
        + Add Expense Item
      </button>
    </div>

    <div className="mt-3">
      <label className="form-label">
        Employee Comment <span style={{ color: 'red' }}>*</span>
      </label>
      <textarea
        className="form-control"
        value={employeeComment}
        onChange={e => setEmployeeComment(e.target.value)}
        rows={3}
      />
    </div>

    {fromMyRequests && (
      <>
        <div className="mt-3">
          <label className="form-label">Manager Comment</label>
          <textarea
            className="form-control"
            value={managerComment}
            readOnly
            rows={2}
          />
        </div>
        <div className="mt-3">
          <label className="form-label">Account Comment</label>
          <textarea
            className="form-control"
            value={accountComment}
            readOnly
            rows={2}
          />
        </div>
        <div className="mt-3">
          <label className="form-label">Status</label>
          <input
            className="form-control"
            value={status}
            readOnly
          />
        </div>
      </>
    )}

    <div className="mt-4 d-flex gap-3 flex-wrap">
      <div>
        <strong>Total Amount: </strong> {totalAmount.toFixed(2)} {selectedCurrency}
      </div>
    </div>

    {status && (
      <div className="mt-4">
        <div className="form-group">
          <label>Status</label>
          <input className="form-control" value={status} readOnly />
        </div>
        {managerComment && (
          <div className="form-group">
            <label>Manager Comment</label>
            <textarea className="form-control" value={managerComment} readOnly />
          </div>
        )}
        {accountComment && (
          <div className="form-group">
            <label>Account Comment</label>
            <textarea className="form-control" value={accountComment} readOnly />
          </div>
        )}
      </div>
    )}

    <div className="mt-4 d-flex gap-3 flex-wrap">
      <button
        className="btn btn-secondary"
        onClick={() => onSubmitClick('Draft')}
        disabled={saving}
        type="button"
      >
        Save as Draft
      </button>
      <button
        className="btn btn-primary"
        onClick={() => onSubmitClick('Pending with Manager')}
        disabled={saving}
        type="button"
      >
        Submit for Approval
      </button>
    </div>

    {/* Confirmation Modal */}
    <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>Confirm Submission</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Are you sure you want to save this form as <strong>{submitStatus}</strong>?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
          Cancel
        </Button>
        <Button variant="primary" onClick={confirmSave} disabled={saving}>
          {saving ? 'Saving...' : 'Yes, Confirm'}
        </Button>
      </Modal.Footer>
    </Modal>
  </div>
);
}
export default EmployeeForm;