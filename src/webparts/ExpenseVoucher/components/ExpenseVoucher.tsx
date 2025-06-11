/*import * as React from 'react';
import { useEffect, useState } from 'react';
import { SPFI, spfi } from '@pnp/sp';
import { SPFx } from '@pnp/sp/presets/all';
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/site-users";
import { MSGraphClientV3 } from '@microsoft/sp-http';
import 'bootstrap/dist/css/bootstrap.min.css';

interface IExpenseVoucherProps {
  context: any;
}

const ExpenseVoucher: React.FC<IExpenseVoucherProps> = ({ context }) => {
  const [sp, setSp] = useState<SPFI>();
  const [employeeInfo, setEmployeeInfo] = useState<{ Id: number; Title: string }>({ Id: 0, Title: '' });
  const [rmInfo, setRmInfo] = useState<{ Id: number; Title: string }>({ Id: 0, Title: '' });
  const [department, setDepartment] = useState('');
  const [expenseItems, setExpenseItems] = useState([{ head: '', description: '', date: new Date().toISOString().substring(0, 10), amount: '' }]);
  const [projectOptions, setProjectOptions] = useState<{ Id: number; Title: string }[]>([]);
  const [currencyOptions, setCurrencyOptions] = useState<string[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [isProjectRelatedOptions, setIsProjectRelatedOptions] = useState<string[]>([]);
  const [isProjectRelated, setIsProjectRelated] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [employeeComment, setEmployeeComment] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().substring(0, 10));
  const [saving, setSaving] = useState(false);
  const [expenseHeads, setExpenseHeads] = useState<string[]>([]); // ← Dynamic Expense Heads

  useEffect(() => {
    const spInstance = spfi().using(SPFx(context));
    setSp(spInstance);
    loadInitialData(spInstance);
  }, []);

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
      const client = await context.msGraphClientFactory.getClient("3") as MSGraphClientV3;
      const profile = await client.api('/me?$select=department').get();
      const managerGraph = await client.api('/me/manager').get();
      const managerUser = await sp.web.siteUsers.getByEmail(managerGraph.mail)();

      setEmployeeInfo({ Id: userDetails.Id, Title: userDetails.Title });
      setDepartment(profile.department || '');
      setRmInfo({ Id: managerUser.Id, Title: managerUser.Title });
      setCurrencyOptions(currencies.Choices || []);
      setIsProjectRelatedOptions(isProjects.Choices || []);
      setProjectOptions(projects);
      setExpenseHeads(expenseCategories.map(cat => cat.Title)); // ← Set dynamic heads
    } catch (error: any) {
      console.error("Error loading data:", error);
      alert("Failed to load initial data.");
    }
  };

  const handleExpenseItemChange = (index: number, field: string, value: string) => {
    const updated = [...expenseItems];
    updated[index] = { ...updated[index], [field]: value };
    setExpenseItems(updated);
  };

  const addExpenseItem = () => {
    setExpenseItems([...expenseItems, { head: '', description: '', date: new Date().toISOString().substring(0, 10), amount: '' }]);
  };

  const removeExpenseItem = (index: number) => {
    setExpenseItems(expenseItems.filter((_, i) => i !== index));
  };

  const totalAmount = expenseItems.reduce((sum, item) => {
    const amt = parseFloat(item.amount);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  const saveForm = async (status: 'Draft' | 'Pending with Manager') => {
    if (!sp) return;
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
        Status: status,
        EmployeeComment: employeeComment,
        ExpenseItems: JSON.stringify(expenseItems),
        Date: voucherDate
      };

      if (isProjectRelated === 'Yes' && selectedProject) {
        itemPayload.ProjectId = parseInt(selectedProject);
      }

      await sp.web.lists.getByTitle('ExpenseTransaction').items.add(itemPayload);
      alert(`Form saved as ${status}`);
      resetForm();
    } catch (error: any) {
      alert(`Error saving form: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedProject('');
    setSelectedCurrency('');
    setIsProjectRelated('');
    setEmployeeComment('');
    setExpenseItems([{ head: '', description: '', date: new Date().toISOString().substring(0, 10), amount: '' }]);
    setVoucherDate(new Date().toISOString().substring(0, 10));
  };

  return (
    <div className="container">
      <h2>Expense Voucher Form</h2>

      <div className="form-group">
        <label>Employee Name</label>
        <input className="form-control" value={employeeInfo.Title} readOnly />
      </div>

      <div className="form-group">
        <label>Department</label>
        <input className="form-control" value={department} readOnly />
      </div>

      <div className="form-group">
        <label>Reporting Manager</label>
        <input className="form-control" value={rmInfo.Title} readOnly />
      </div>

      <div className="form-group">
        <label>Is Project Related?</label>
        <select className="form-control" value={isProjectRelated} onChange={(e) => setIsProjectRelated(e.target.value)}>
          <option value="">-- Select --</option>
          {isProjectRelatedOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {isProjectRelated === 'Yes' && (
        <div className="form-group">
          <label>Project</label>
          <select className="form-control" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            <option value="">-- Select Project --</option>
            {projectOptions.map(p => (
              <option key={p.Id} value={p.Id}>{p.Title}</option>
            ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label>Currency</label>
        <select className="form-control" value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)}>
          <option value="">-- Select Currency --</option>
          {currencyOptions.map(cur => (
            <option key={cur} value={cur}>{cur}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Date</label>
        <input type="date" className="form-control" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} />
      </div>

      <h4>Expense Items</h4>
      {expenseItems.map((item, index) => (
        <div key={index} className="expense-item row mb-2">
          <div className="col">
            <select className="form-control" value={item.head} onChange={(e) => handleExpenseItemChange(index, 'head', e.target.value)}>
              <option value="">-- Select Head --</option>
              {expenseHeads.map(head => (
                <option key={head} value={head}>{head}</option>
              ))}
            </select>
          </div>
          <div className="col">
            <input type="text" className="form-control" placeholder="Description" value={item.description} onChange={(e) => handleExpenseItemChange(index, 'description', e.target.value)} />
          </div>
          <div className="col">
            <input type="date" className="form-control" value={item.date} onChange={(e) => handleExpenseItemChange(index, 'date', e.target.value)} />
          </div>
          <div className="col">
            <input type="number" className="form-control" placeholder="Amount" value={item.amount} onChange={(e) => handleExpenseItemChange(index, 'amount', e.target.value)} />
          </div>
          <div className="col-auto">
            <button className="btn btn-danger" onClick={() => removeExpenseItem(index)} disabled={expenseItems.length === 1}>Remove</button>
          </div>
        </div>
      ))}

      <button className="btn btn-primary mb-3" onClick={addExpenseItem}>Add Expense Item</button>

      <div className="form-group">
        <label>Employee Comment</label>
        <textarea className="form-control" rows={3} value={employeeComment} onChange={(e) => setEmployeeComment(e.target.value)} />
      </div>

      <div className="form-group">
        <strong>Total Amount: ₹ {totalAmount.toFixed(2)}</strong>
      </div>

      <div className="form-group">
        <button className="btn btn-success mr-2" onClick={() => saveForm('Pending with Manager')} disabled={saving}>Submit</button>
        <button className="btn btn-secondary" onClick={() => saveForm('Draft')} disabled={saving}>Save as Draft</button>
      </div>
    </div>
  );
};

export default ExpenseVoucher;
*/
 'use client';
import React, { useState } from 'react';
import Tesseract from 'tesseract.js';

const ReceiptScanner = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [formattedDate, setFormattedDate] = useState('');

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
          const mm = String(parsed.getMonth() + 1).padStart(2, '0');
          const dd = String(parsed.getDate()).padStart(2, '0');
          const yy = String(parsed.getFullYear()).slice(-2);
          return `${mm}/${dd}/${yy}`;
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageBase64 = reader.result as string;
      setImageSrc(imageBase64);

      const text = await extractTextFromImage(imageBase64);
      const amt = extractAmount(text);
      const date = extractDate(text);

      setAmount(amt || 'Not Found');
      setFormattedDate(date);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div style={{ maxWidth: '400px', margin: 'auto' }}>
      <h2>Upload Receipt</h2>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        id="uploadInput"
        onChange={handleImageUpload}
      />

      <button
        onClick={() => document.getElementById('uploadInput')?.click()}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        📁 Upload from Device
      </button>

      {imageSrc && (
        <>
          <img src={imageSrc} alt="Uploaded Receipt" style={{ width: '100%', marginBottom: '10px' }} />
          <p><strong>💰 Amount:</strong> {amount}</p>
          <p><strong>📅 Date:</strong> {formattedDate}</p>
        </>
      )}
    </div>
  );
};

export default ReceiptScanner;
