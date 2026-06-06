import React, { useState, useEffect } from 'react';
/* import all the required icons */
import { Search, Filter, Plus, Edit, Trash2, FolderOpen, MoreVertical, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
/* api call endpoint for connecting with the backend */
import apiClient from '../../../services/api';
/* form modal which helps the admin to easily deal with the forms for creating and editing categories */
import FormModal from './FormModal';
/* base admin table which helps to display the data in a table format */
import BaseAdminTable from './BaseAdminTable';

/* tabs to switch between frames, contact lenses and accessories to view the cateogories in different tabs */

const CAT_TABS = [
  { key: 'frame', label: 'Frames' },
  { key: 'lens', label: 'Contact Lenses' },
  { key: 'accessory', label: 'Accessories' },
];
/* drop down while creating a new cateogory to decide weather a cateogoy belongs to which particular tab */
const CAT_TYPE_OPTIONS = [
  { value: 'frame', label: 'Frames' },
  { value: 'lens', label: 'Contact Lenses' },
  { value: 'accessory', label: 'Accessories' },
];

/* creating the cateogory table */

const CategoryTable = () => {
  /* states needed for the cateogory table */
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('frame');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  /* run the fetchCategories function when the page is loaded */

  useEffect(() => { fetchCategories(); }, []);

  /* fetch cateogories from the backend */

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/catalog/categories/');
      const data = res.data;
      setCategories(Array.isArray(data) ? data : (data.results || []));
    } catch { console.error("check your godamm code idiot") } finally { setLoading(false); }
  };

  /* delete multiple cateogories at a time */

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} categor${selectedIds.size === 1 ? 'y' : 'ies'}?`)) return;
    await Promise.all([...selectedIds].map(id => apiClient.delete(`/catalog/categories/${id}/`).catch(() => { })));
    setSelectedIds(new Set());
    fetchCategories();
  };

  const bulkActions = [
    { label: 'Delete Selected', variant: 'danger', icon: Trash2, onClick: bulkDelete },
  ];
  /* a form which pops up when the admin wants to create a new cateogory */
  const handleCreateClick = () => { setFormMode('create'); setSelectedCategory({ category_type: activeTab }); setShowForm(true); };
  /*  a form which pops up when the admin wants to edit an existing cateogory */
  const handleEditClick = (c) => { setFormMode('edit'); setSelectedCategory(c); setShowForm(true); };
  /* a pop up when the admin wants to delete a particular cateogory */
  const handleDeleteClick = (c) => { setFormMode('edit'); setSelectedCategory(c); setShowForm(true); };

  /* creating a new caeogory or updating an existing cateogory */

  const handleFormSubmit = async (formData) => {
    const data = new FormData();
    Object.keys(formData).forEach(k => {
      if (formData[k] != null) {
        if (k === 'parent' && formData[k] === '') return;
        if (k === 'image' && typeof formData[k] === 'string') return;
        data.append(k, formData[k]);
      }
    });
    try {
      /* NEW CATEOGORY ENTRY */
      if (formMode === 'create') await apiClient.post('/catalog/categories/', data);
      /* EXISTING CATEOGORY EDIT ENTRY */
      else await apiClient.patch(`/catalog/categories/${selectedCategory.id}/`, data);
      setShowForm(false);
      /* FETCH THE CATEOGORIES AFTER A NEW ENTRY OR AN EDIT FOR AN EXISTING ENTRY */
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };
  /* delete a particular cateogory */
  const handleFormDelete = async (id) => {
    try {
      await apiClient.delete(`/catalog/categories/${id}/`);
      setShowForm(false);
      /* fetch the cateogories after deleting one */
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  /*  */

  const filtered = categories
    .filter(c => ((c.group || c.category_type || 'frame').toString().toLowerCase()) === activeTab)
    .filter(c => [c.name, c.slug, c.description].some(v => (v || '').toLowerCase().includes(searchQuery.toLowerCase())));

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  /* entities in the admin's side cateogory table */

  const columns = [
    { label: 'Category', key: 'category', sortable: true },
    { label: 'Status', key: 'status', sortable: true },
    { label: 'Action', key: 'action', align: 'right' }
  ];

  /* list of cateogories will be displayed on a table with the following columns */

  const renderRow = (c, idx, { isSelected, onToggle } = {}) => (
    // cateogory in a row will be displayed like this 
    <tr key={c.id || idx} style={{ borderBottom: '1px solid #EAECF0', backgroundColor: isSelected ? '#F9F5FF' : '#fff' }}>
      {/* this coloumn has a check box to select or diselect used while performing bulk actions */}
      <td style={{ padding: '16px 24px' }}>
        <input type="checkbox" checked={!!isSelected} onChange={onToggle} style={{ cursor: 'pointer', borderRadius: '3px', accentColor: '#7F56D9' }} />
      </td>
      {/* this coloumn has multiple fields like name of the cateogory and the icon or the image of the cateogory */}
      {/* START */}
      <td style={{ padding: '16px 24px' }}>
        {/* start of the container */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* image  */}
          <div style={{ width: 42, height: 42, borderRadius: 8, background: '#F4EBFF', color: '#7F56D9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {c.image ? <img src={c.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FolderOpen size={20} />}
          </div>
          {/* name of the cateogory */}
          <div>
            <div style={{ fontWeight: 600, color: '#101828', fontSize: '11px' }}>{c.name}</div>
          </div>
        </div>
        {/* end of container */}
      </td>
      {/* END */}
      {/* status which decides weather a cateogory to be shown in the website or not  */}
      <td style={{ padding: '16px 24px' }}>
        <span style={{
          backgroundColor: c.is_active ? '#ECFDF3' : '#F2F4F7',
          color: c.is_active ? '#027A48' : '#344054',
          padding: '4px 10px',
          borderRadius: '13px',
          fontSize: '10px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: `1px solid ${c.is_active ? '#ABEFC6' : '#D0D5DD'}`
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.is_active ? '#12B76A' : '#667085' }}></span>
          {c.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      {/*  ACTIONS - this coloumn have multiple fields (like editing or deleting a cateogory) */}
      <td style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {/* edit button */}
          {/* calling the edit function defined in the the same file  */}
          <div
            onClick={() => handleEditClick(c)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Edit Category"
          >
            <Edit2 size={16} />
          </div>
          {/* delete button */}
          {/* calling the delete function defined in the same file  */}
          <div
            onClick={() => handleDeleteClick(c)}
            style={{ width: 32, height: 32, border: '1px solid #D0D5DD', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#ffffff', color: '#667085', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)' }}
            title="Delete Category"
          >
            <Trash2 size={16} />
          </div>
        </div>
      </td>
      {/* end of the actions button */}
    </tr>
  );
  {/* end of the row in the table */ }
  const tabCounts = Object.fromEntries(CAT_TABS.map(t => [t.key, categories.filter(c => ((c.group || c.category_type || 'frame').toString().toLowerCase()) === t.key).length]));

  return (
    <>
      {/* Tab strip */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: 8, padding: 4, width: 'fit-content' }}>
        {CAT_TABS.map(tab => (
          <button
            key={tab.key}
            /* an onclick event which triggers when clicked on any particular page (prev, next, numbers) */
            onClick={() => { setActiveTab(tab.key); setPage(1); setSearchQuery(''); }}
            style={{
              padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: activeTab === tab.key ? '#fff' : 'transparent',
              color: activeTab === tab.key ? '#7F56D9' : '#667085',
              boxShadow: activeTab === tab.key ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {/* shows in which tab the user is currently on */}
            {tab.label}
            <span style={{ background: activeTab === tab.key ? '#F4EBFF' : '#F2F4F7', color: activeTab === tab.key ? '#7F56D9' : '#667085', borderRadius: 10, padding: '1px 7px', fontSize: 10 }}>
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* using a reusable component to show things on the cateogory table  */}
      <BaseAdminTable
        title="Product Categories"
        count={filtered.length}
        countLabel="Categories"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAdd={handleCreateClick}
        addLabel="Add Category"
        columns={columns}
        data={paginated}
        loading={loading}
        renderRow={renderRow}
        selectedIds={selectedIds}
        onSelectIds={setSelectedIds}
        bulkActions={bulkActions}
        pagination={{
          page,
          perPage,
          totalCount: filtered.length,
          onPageChange: setPage,
          onPerPageChange: setPerPage
        }}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        filterContent={
          <div style={{ display: 'flex', gap: '13px' }}>
            <div style={{ fontSize: '11px', color: '#667085' }}>No active filters available for categories.</div>
          </div>
        }
      />
      {/* using a reusable component to show the form for creating or updating the cateogories across all the tabs in the cateogory page */}
      <FormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={handleFormSubmit}
        onDelete={handleFormDelete} mode={formMode} title="Category"
        fields={[
          { name: 'name', label: 'Category Name', type: 'text', required: true },
          { name: 'group', label: 'Group', type: 'select', required: true, options: CAT_TYPE_OPTIONS },
          { name: 'image', label: 'Category Image', type: 'file' },
          { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
        ]}
        initialData={selectedCategory || {}} />
    </>
  );
};

export default CategoryTable;
