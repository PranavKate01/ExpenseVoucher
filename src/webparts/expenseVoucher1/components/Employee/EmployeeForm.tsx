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

interface IExpenseVoucherProps {
  context: any;
  onBack: () => void;
  goToMyRequests: () => void;
  editItemId: number | null; // Edit item ID
}

const EmployeeForm: React.FC<IExpenseVoucherProps> = ({ context, onBack, goToMyRequests, editItemId }) => {
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
  const [expenseHeads, setExpenseHeads] = useState<string[]>([]);

  useEffect(() => {
    const spInstance = spfi().using(SPFx(context));
    setSp(spInstance);
    loadInitialData(spInstance);
    if (editItemId) {
      loadEditData(spInstance, editItemId);
    }
  }, [editItemId]);

  // Load initial data for the form
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
    } catch (error: any) {
      console.error('Error loading data:', error);
      alert('Failed to load initial data.');
    }
  };

  // Load data for the existing expense voucher when editing
  const loadEditData = async (sp: SPFI, itemId: number) => {
    try {
      const item = await sp.web.lists.getByTitle('ExpenseTransaction').items.getById(itemId)();
      
      setSelectedCurrency(item.Currency || '');
      setIsProjectRelated(item.IsProjectRelated || '');
      setEmployeeComment(item.EmployeeComment || '');
      setVoucherDate(item.Date || new Date().toISOString().substring(0, 10));
      setExpenseItems(JSON.parse(item.ExpenseItems || '[]') || []);

      if (item.IsProjectRelated === 'Yes') {
        setSelectedProject(item.ProjectId?.toString() || '');
      }
    } catch (error: any) {
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
        Status: status,
        EmployeeComment: employeeComment,
        Date: voucherDate
      };

      try {
        itemPayload.ExpenseItems = JSON.stringify(expenseItems);
      } catch (jsonError) {
        console.warn('Expense items not serializable', jsonError);
        alert('Failed to save expense items.');
        setSaving(false);
        return;
      }

      if (isProjectRelated === 'Yes' && selectedProject) {
        itemPayload.ProjectId = parseInt(selectedProject);
      }

      if (editItemId) {
        await sp.web.lists.getByTitle('ExpenseTransaction').items.getById(editItemId).update(itemPayload);
        alert('Form updated successfully');
      } else {
        await sp.web.lists.getByTitle('ExpenseTransaction').items.add(itemPayload);
        alert(`Form saved as ${status}`);
      }
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
    <div className="container mt-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <button className="btn btn-link text-primary" onClick={onBack}>
          &larr; Back
        </button>
        <h4 className="mb-0">{editItemId ? 'Edit Expense Voucher' : 'New Expense Voucher'}</h4>
        <button className="btn btn-outline-primary" onClick={goToMyRequests}>
          My Requests
        </button>
      </div>

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
<option value="">-- Select --</option>
{projectOptions.map(project => (
<option key={project.Id} value={project.Id.toString()}>
{project.Title}
</option>
))}
</select>
</div>
)}
  <div className="form-group">
    <label>Currency</label>
    <select className="form-control" value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)}>
      <option value="">-- Select --</option>
      {currencyOptions.map(currency => (
        <option key={currency} value={currency}>
          {currency}
        </option>
      ))}
    </select>
  </div>

  <div className="form-group">
    <label>Voucher Date</label>
    <input type="date" className="form-control" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} />
  </div>
 
 <h5>Expense Items</h5>
{expenseItems.map((item, index) => (
  <div key={index} className="expense-item mb-3">
    <div className="d-flex align-items-center">
      {/* Expense Head */}
      <div className="form-group mr-3">
        <label>Expense Head</label>
        <select
          className="form-control"
          value={item.head}
          onChange={(e) => handleExpenseItemChange(index, 'head', e.target.value)}
        >
          <option value="">-- Select --</option>
          {expenseHeads.map(head => (
            <option key={head} value={head}>{head}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="form-group mr-3">
        <label>Description</label>
        <input
          className="form-control"
          value={item.description}
          onChange={(e) => handleExpenseItemChange(index, 'description', e.target.value)}
        />
      </div>

      {/* Date */}
      <div className="form-group mr-3">
        <label>Date</label>
        <input
          type="date"
          className="form-control"
          value={item.date}
          onChange={(e) => handleExpenseItemChange(index, 'date', e.target.value)}
        />
      </div>

      {/* Amount */}
      <div className="form-group mr-3">
        <label>Amount</label>
        <input
          className="form-control"
          type="number"
          value={item.amount}
          onChange={(e) => handleExpenseItemChange(index, 'amount', e.target.value)}
        />
      </div>

      {/* Remove Button */}
      <div className="form-group">
        <label>&nbsp;</label>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => removeExpenseItem(index)}
        >
          Remove
        </button>
      </div>
    </div>
  </div>
))}

  <button type="button" className="btn btn-primary mt-2" onClick={addExpenseItem}>
    Add Expense Item
  </button>

  <div className="form-group mt-3">
    <label>Total Amount</label>
    <input className="form-control" value={totalAmount} readOnly />
  </div>
  <div className="form-group">
    <label>Employee Comments</label>
    <textarea className="form-control" rows={3} value={employeeComment} onChange={(e) => setEmployeeComment(e.target.value)} />
  </div>
  <div className="text-center mt-4">
    <button
      className="btn btn-primary"
      onClick={() => saveForm('Draft')}
      disabled={saving}
    >
      {saving ? 'Saving...' : 'Save as Draft'}
    </button>
    <button
      className="btn btn-success ml-2"
      onClick={() => saveForm('Pending with Manager')}
      disabled={saving}
    >
      {saving ? 'Saving...' : 'Submit for Approval'}
    </button>
  </div>
</div>
);
};

export default EmployeeForm;
