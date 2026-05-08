import React, { useState, useEffect, useMemo } from 'react';
import { 
  Car, 
  Calendar, 
  AlertTriangle, 
  Plus, 
  Search, 
  FileText, 
  Settings, 
  ChevronRight, 
  Trash2, 
  Edit3,
  CheckCircle2,
  Clock,
  Wrench,
  ShieldAlert,
  Fuel,
  Info,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Types
interface Vehicle {
  id?: number;
  nr_inmatriculare: string;
  tip_auto: string;
  marca_model: string;
  utilizator: string;
  firma: string;
  serie_sasiu: string;
  an_fabricatie: number;
  data_inmatriculare: string;
  decizie_conventii: string;
  
  // Service
  service_data: string;
  km_bord: number;
  km_revizie: number;
  data_revizie: string;
  
  // Documents
  rovinieta_start: string;
  rovinieta_expiry: string;
  itp_start: string;
  itp_expiry: string;
  rca_start: string;
  rca_expiry: string;
  casco_start: string;
  casco_expiry: string;
  
  // Tires
  anvelope_dimensiuni: string;
  anvelope_vara_achizitie: string;
  anvelope_vara_schimbare: string;
  anvelope_iarna_achizitie: string;
  anvelope_iarna_schimbare: string;
}

const API_URL = '/api';

const getDateStatusClass = (dateStr: string) => {
  if (!dateStr) return 'text-gray-400';
  const expirationDate = dayjs(dateStr);
  const today = dayjs();
  
  if (expirationDate.isBefore(today)) {
    return 'text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded';
  }
  if (expirationDate.isBefore(today.add(30, 'day'))) {
    return 'text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded';
  }
  return 'text-green-600 font-medium px-2 py-0.5';
};

export default function App() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fleet' | 'alerts' | 'add'>('dashboard');
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await fetch(`${API_URL}/vehicles`);
      const data = await res.json();
      setVehicles(data);
    } catch (err) {
      console.error('Failed to fetch vehicles', err);
    } finally {
      setLoading(false);
    }
  };

  const saveVehicle = async (v: Vehicle) => {
    const method = v.id ? 'PUT' : 'POST';
    const url = v.id ? `${API_URL}/vehicles/${v.id}` : `${API_URL}/vehicles`;
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v)
      });
      if (res.ok) {
        fetchVehicles();
        setActiveTab('fleet');
        setEditingVehicle(null);
      }
    } catch (err) {
      alert('Eroare la salvarea vehiculului');
    }
  };

  const deleteVehicle = async (id: number) => {
    if (!confirm('Ești sigur că vrei să ștergi acest vehicul?')) return;
    try {
      await fetch(`${API_URL}/vehicles/${id}`, { method: 'DELETE' });
      fetchVehicles();
    } catch (err) {
      alert('Eroare la ștergere');
    }
  };

  const expiringDocuments = useMemo(() => {
    const today = dayjs();
    const next30Days = today.add(30, 'day');
    
    const alerts: { vehicle: Vehicle; doc: string; date: string; type: 'rovinieta' | 'itp' | 'rca' | 'casco' | 'revizie' }[] = [];
    
    vehicles.forEach(v => {
      const checks = [
        { key: 'rovinieta_expiry', name: 'Rovinieta', type: 'rovinieta' as const },
        { key: 'itp_expiry', name: 'ITP', type: 'itp' as const },
        { key: 'rca_expiry', name: 'RCA', type: 'rca' as const },
        { key: 'casco_expiry', name: 'CASCO', type: 'casco' as const },
        { key: 'data_revizie', name: 'Revizie', type: 'revizie' as const },
      ];
      
      checks.forEach(c => {
        const dateStr = v[c.key as keyof Vehicle] as string;
        if (dateStr) {
          const d = dayjs(dateStr);
          if (d.isAfter(today.subtract(1, 'day')) && d.isBefore(next30Days)) {
            alerts.push({ vehicle: v, doc: c.name, date: dateStr, type: c.type });
          }
        }
      });
    });
    
    return alerts.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  }, [vehicles]);

  const stats = useMemo(() => {
    return {
      total: vehicles.length,
      alerts: expiringDocuments.length,
      autoturisme: vehicles.filter(v => v.tip_auto === 'Autoturism').length,
      autoutilitare: vehicles.filter(v => v.tip_auto === 'Autoutilitara').length,
    };
  }, [vehicles, expiringDocuments]);

  const exportAlertsToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Raport Alerte Parc Auto', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generat la: ${dayjs().format('DD.MM.YYYY HH:mm')}`, 14, 30);
    
    const tableData = expiringDocuments.map(alert => [
      alert.vehicle.nr_inmatriculare,
      alert.vehicle.marca_model,
      alert.doc,
      dayjs(alert.date).format('DD.MM.YYYY'),
      `${dayjs(alert.date).diff(dayjs(), 'day')} zile`
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Nr. Inmatriculare', 'Masina', 'Document', 'Data Expirare', 'Ramas']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`alerte_parc_auto_${dayjs().format('YYYY_MM_DD')}.pdf`);
  };

  const exportFleetToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Raport Inventar Parc Auto', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generat la: ${dayjs().format('DD.MM.YYYY HH:mm')}`, 14, 30);
    doc.text(`Total vehicule: ${vehicles.length}`, 14, 35);

    const tableData = vehicles.map(v => [
      v.nr_inmatriculare,
      v.marca_model,
      v.utilizator,
      v.serie_sasiu || '-',
      v.an_fabricatie.toString()
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Nr. Inmatriculare', 'Model', 'Utilizator', 'Serie Sasiu', 'An']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`inventar_parc_auto_${dayjs().format('YYYY_MM_DD')}.pdf`);
  };

  const filteredVehicles = vehicles.filter(v => 
    v.nr_inmatriculare.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.marca_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.utilizator.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Car className="text-white w-6 h-6" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">Parc Auto</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<Clock className="w-5 h-5" />}
            label="Dashboard"
          />
          <NavItem 
            active={activeTab === 'fleet'} 
            onClick={() => setActiveTab('fleet')}
            icon={<Car className="w-5 h-5" />}
            label="Parc Auto"
          />
          <NavItem 
            active={activeTab === 'alerts'} 
            onClick={() => setActiveTab('alerts')}
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Alerte"
            count={expiringDocuments.length}
          />
          <NavItem 
            active={activeTab === 'add'} 
            onClick={() => { setEditingVehicle(null); setActiveTab('add'); }}
            icon={<Plus className="w-5 h-5" />}
            label="Adaugă Vehicul"
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {activeTab === 'dashboard' && (
                <div className="flex gap-4 items-center">
                  <span>Dashboard</span>
                  <button 
                    onClick={exportFleetToPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm shadow-sm"
                  >
                    <Download className="w-4 h-4 text-blue-600" />
                    Raport Complet PDF
                  </button>
                </div>
              )}
              {activeTab === 'fleet' && "Parc Auto"}
              {activeTab === 'alerts' && (
                <div className="flex gap-4 items-center">
                  <span>Alerte Documente</span>
                  <button 
                    onClick={exportAlertsToPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm shadow-sm"
                  >
                    <Download className="w-4 h-4 text-blue-600" />
                    Export PDF Alerte
                  </button>
                </div>
              )}
              {activeTab === 'add' && (editingVehicle ? "Editează Vehicul" : "Adaugă Vehicul Nou")}
            </h2>
            <p className="text-gray-500 mt-1">
              {activeTab === 'dashboard' && "Gestionare centralizată a parcului auto."}
              {activeTab === 'fleet' && `Administrează cele ${vehicles.length} vehicule înregistrate.`}
              {activeTab === 'alerts' && "Documente care expiră în următoarele 30 de zile."}
            </p>
          </div>
          
          {activeTab === 'fleet' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Caută nr, marcă, utilizator..."
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dash" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <StatCard label="Total Vehicule" value={stats.total} icon={<Car className="text-blue-600" />} color="blue" />
              <StatCard label="Alerte Active" value={stats.alerts} icon={<AlertTriangle className="text-amber-600" />} color="amber" highlight={stats.alerts > 0} />
              <StatCard label="Autoturisme" value={stats.autoturisme} icon={<Car className="text-green-600" />} color="green" />
              <StatCard label="Autoutilitare" value={stats.autoutilitare} icon={<Fuel className="text-purple-600" />} color="purple" />
              
              <div className="md:col-span-2 lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mt-6">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Status Documente Parc Auto
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] table-fixed">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-3 py-3 font-bold text-gray-500 uppercase w-48">Vehicul</th>
                        <th className="px-3 py-3 font-bold text-gray-500 uppercase w-40">Utilizator</th>
                        <th className="px-1 py-3 font-bold text-gray-500 uppercase text-center border-l border-gray-100">Rovinietă</th>
                        <th className="px-1 py-3 font-bold text-blue-500 uppercase text-center w-12">Zile</th>
                        <th className="px-1 py-3 font-bold text-gray-500 uppercase text-center border-l border-gray-100">ITP</th>
                        <th className="px-1 py-3 font-bold text-blue-500 uppercase text-center w-12">Zile</th>
                        <th className="px-1 py-3 font-bold text-gray-500 uppercase text-center border-l border-gray-100">RCA</th>
                        <th className="px-1 py-3 font-bold text-blue-500 uppercase text-center w-12">Zile</th>
                        <th className="px-1 py-3 font-bold text-gray-500 uppercase text-center border-l border-gray-100">CASCO</th>
                        <th className="px-1 py-3 font-bold text-blue-500 uppercase text-center w-12">Zile</th>
                        <th className="px-1 py-3 font-bold text-gray-500 uppercase text-center border-l border-gray-100">Revizie</th>
                        <th className="px-1 py-3 font-bold text-blue-500 uppercase text-center w-12">Zile</th>
                        <th className="px-1 py-3 font-bold text-gray-500 uppercase text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {vehicles.map(v => (
                        <tr key={v.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-3 py-3 truncate">
                            <p className="font-bold">{v.nr_inmatriculare}</p>
                            <p className="text-[9px] text-gray-400 uppercase truncate">{v.marca_model}</p>
                          </td>
                          <td className="px-3 py-3 truncate">
                            <p className="font-medium text-gray-700">{v.utilizator || '-'}</p>
                          </td>
                          
                          {/* Rovinieta */}
                          <td className="px-1 py-3 text-center border-l border-gray-50">
                            <span className={getDateStatusClass(v.rovinieta_expiry)}>
                              {v.rovinieta_expiry ? dayjs(v.rovinieta_expiry).format('DD.MM') : '-'}
                            </span>
                          </td>
                          <td className="px-1 py-3 text-center font-mono text-[9px] text-gray-500">
                            {v.rovinieta_expiry ? `${dayjs(v.rovinieta_expiry).diff(dayjs(), 'day')}d` : '-'}
                          </td>

                          {/* ITP */}
                          <td className="px-1 py-3 text-center border-l border-gray-50">
                            <span className={getDateStatusClass(v.itp_expiry)}>
                              {v.itp_expiry ? dayjs(v.itp_expiry).format('DD.MM') : '-'}
                            </span>
                          </td>
                          <td className="px-1 py-3 text-center font-mono text-[9px] text-gray-500">
                            {v.itp_expiry ? `${dayjs(v.itp_expiry).diff(dayjs(), 'day')}d` : '-'}
                          </td>

                          {/* RCA */}
                          <td className="px-1 py-3 text-center border-l border-gray-50">
                            <span className={getDateStatusClass(v.rca_expiry)}>
                              {v.rca_expiry ? dayjs(v.rca_expiry).format('DD.MM') : '-'}
                            </span>
                          </td>
                          <td className="px-1 py-3 text-center font-mono text-[9px] text-gray-500">
                            {v.rca_expiry ? `${dayjs(v.rca_expiry).diff(dayjs(), 'day')}d` : '-'}
                          </td>

                          {/* CASCO */}
                          <td className="px-1 py-3 text-center border-l border-gray-50">
                            <span className={getDateStatusClass(v.casco_expiry)}>
                              {v.casco_expiry ? dayjs(v.casco_expiry).format('DD.MM') : '-'}
                            </span>
                          </td>
                          <td className="px-1 py-3 text-center font-mono text-[9px] text-gray-500">
                            {v.casco_expiry ? `${dayjs(v.casco_expiry).diff(dayjs(), 'day')}d` : '-'}
                          </td>

                          {/* Revizie */}
                          <td className="px-1 py-3 text-center border-l border-gray-50">
                            <span className={getDateStatusClass(v.data_revizie)}>
                              {v.data_revizie ? dayjs(v.data_revizie).format('DD.MM') : '-'}
                            </span>
                          </td>
                          <td className="px-1 py-3 text-center font-mono text-[9px] text-gray-500">
                            {v.data_revizie ? `${dayjs(v.data_revizie).diff(dayjs(), 'day')}d` : '-'}
                          </td>

                          {/* Action */}
                          <td className="px-1 py-3 text-center">
                            <button 
                              onClick={() => { setEditingVehicle(v); setActiveTab('add'); }}
                              className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'fleet' && (
            <motion.div 
              key="fleet" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Vehicul</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tip / Detalii</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Utilizator / Firmă</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">KM Bord</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredVehicles.map(v => (
                      <tr key={v.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 text-blue-700 font-mono text-sm font-bold px-3 py-1 rounded-md border border-blue-200 uppercase tracking-tighter">
                              {v.nr_inmatriculare}
                            </div>
                            <div>
                              <p className="font-bold text-sm">{v.marca_model}</p>
                              <p className="text-xs text-gray-400">Sasiu: {v.serie_sasiu || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                            v.tip_auto === 'Autoturism' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-purple-50 text-purple-700 border-purple-100'
                          }`}>
                            {v.tip_auto}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">An: {v.an_fabricatie}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium">{v.utilizator}</p>
                          <p className="text-xs text-gray-400">{v.firma}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-700 font-mono">
                            <Wrench className="w-3.5 h-3.5 text-gray-400" />
                            {v.km_bord?.toLocaleString()} KM
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => { setEditingVehicle(v); setActiveTab('add'); }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteVehicle(v.id!)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'alerts' && (
            <motion.div 
              key="alerts" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {expiringDocuments.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-gray-300">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Toate actele sunt în regulă!</p>
                  <p className="text-gray-500">Nu am găsit niciun document care să expire în următoarele 30 de zile.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {expiringDocuments.map((alert, i) => (
                    <motion.div 
                      key={i} 
                      whileHover={{ y: -5 }}
                      onClick={() => {
                        setEditingVehicle(alert.vehicle);
                        setActiveTab('add');
                      }}
                      className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-xl ${
                          alert.type === 'rovinieta' ? 'bg-blue-100 text-blue-600' :
                          alert.type === 'itp' ? 'bg-purple-100 text-purple-600' :
                          alert.type === 'rca' ? 'bg-green-100 text-green-600' :
                          alert.type === 'casco' ? 'bg-amber-100 text-amber-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 border border-red-100">
                            <ShieldAlert className="w-3 h-3" />
                            Expiră
                          </span>
                          <span className="text-[10px] text-blue-600 font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                            Click pentru Editare
                          </span>
                        </div>
                      </div>
                      <h4 className="font-bold text-lg">{alert.vehicle.nr_inmatriculare}</h4>
                      <p className="text-gray-500 text-sm mb-4">{alert.vehicle.marca_model}</p>
                      <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                        <p className="text-xs uppercase font-bold text-gray-400 tracking-wider font-mono">{alert.doc}</p>
                        <p className="text-sm font-bold text-red-600">{dayjs(alert.date).format('DD MMMM YYYY')}</p>
                        <p className="text-xs text-gray-500">în {dayjs(alert.date).diff(dayjs(), 'day')} zile</p>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit3 className="w-4 h-4 text-blue-500" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'add' && (
            <motion.div 
              key="add" 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm max-w-4xl mx-auto"
            >
              <VehicleForm 
                initialData={editingVehicle} 
                onSave={saveVehicle} 
                onCancel={() => setActiveTab('fleet')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Components
function NavItem({ active, onClick, icon, label, count }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, count?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
        active 
          ? 'bg-blue-50 text-blue-700 shadow-sm' 
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={active ? 'text-blue-600' : 'text-gray-400'}>{icon}</span>
        <span className="font-semibold text-sm">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          active ? 'bg-blue-200 text-blue-800' : 'bg-red-100 text-red-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

function StatCard({ label, value, icon, color, highlight }: { label: string, value: number, icon: React.ReactNode, color: string, highlight?: boolean }) {
  return (
    <div className={`bg-white p-6 rounded-2xl border border-gray-200 shadow-sm transition-transform hover:scale-[1.02] ${highlight ? 'ring-2 ring-amber-400 bg-amber-50/10' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg bg-${color}-50`}>
          {icon}
        </div>
        {highlight && <div className="animate-pulse bg-amber-400 h-2 w-2 rounded-full"></div>}
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <p className="text-sm font-medium text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function VehicleForm({ initialData, onSave, onCancel }: { initialData: Vehicle | null, onSave: (v: Vehicle) => void, onCancel: () => void }) {
  const [v, setV] = useState<Vehicle>(initialData || {
    nr_inmatriculare: '', tip_auto: 'Autoturism', marca_model: '', utilizator: '',
    firma: '', serie_sasiu: '', an_fabricatie: new Date().getFullYear(),
    data_inmatriculare: '', decizie_conventii: '',
    service_data: '', km_bord: 0, km_revizie: 0, data_revizie: '',
    rovinieta_start: '', rovinieta_expiry: '', itp_start: '', itp_expiry: '',
    rca_start: '', rca_expiry: '', casco_start: '', casco_expiry: '',
    anvelope_dimensiuni: '', anvelope_vara_achizitie: '', anvelope_vara_schimbare: '',
    anvelope_iarna_achizitie: '', anvelope_iarna_schimbare: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setV(prev => ({ ...prev, [name]: name.includes('km') || name === 'an_fabricatie' ? parseInt(value) || 0 : value }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h4 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-6 pb-2 border-b-2 border-blue-100 flex items-center gap-2">
          <Info className="w-4 h-4" /> Informații Generale
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField label="Nr. Inmatriculare" name="nr_inmatriculare" value={v.nr_inmatriculare} onChange={handleChange} placeholder="B 123 ABC" required />
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Tip Auto</label>
            <select 
              name="tip_auto" 
              value={v.tip_auto} 
              onChange={handleChange} 
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Autoturism">Autoturism</option>
              <option value="Autoutilitara">Autoutilitara</option>
            </select>
          </div>
          <FormField label="Marcă și Model" name="marca_model" value={v.marca_model} onChange={handleChange} placeholder="VW Golf VII" />
          <FormField label="Utilizator" name="utilizator" value={v.utilizator} onChange={handleChange} placeholder="Popescu Ion" />
          <FormField label="Firma" name="firma" value={v.firma} onChange={handleChange} placeholder="ABC Logistics SRL" />
          <FormField label="Serie Sasiu" name="serie_sasiu" value={v.serie_sasiu} onChange={handleChange} />
          <FormField label="An Fabricatie" name="an_fabricatie" type="number" value={v.an_fabricatie.toString()} onChange={handleChange} />
          <FormField label="Data Inmatriculare" name="data_inmatriculare" type="date" value={v.data_inmatriculare} onChange={handleChange} />
          <div className="md:col-span-3">
            <label className="text-xs font-bold text-gray-500 uppercase">Decizie & Conventii</label>
            <textarea 
              name="decizie_conventii" 
              value={v.decizie_conventii} 
              onChange={handleChange} 
              rows={2}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none mt-2"
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-green-600 uppercase tracking-widest mb-6 pb-2 border-b-2 border-green-100 flex items-center gap-2">
          <Wrench className="w-4 h-4" /> Service & Revizii
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <FormField label="Data Service" name="service_data" type="date" value={v.service_data} onChange={handleChange} />
          <FormField label="KM la Bord" name="km_bord" type="number" value={v.km_bord.toString()} onChange={handleChange} />
          <FormField label="KM Revizie" name="km_revizie" type="number" value={v.km_revizie.toString()} onChange={handleChange} />
          <FormField label="Data Revizie" name="data_revizie" type="date" value={v.data_revizie} onChange={handleChange} />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-amber-600 uppercase tracking-widest mb-6 pb-2 border-b-2 border-amber-100 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Documente & Asigurări
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
          <DocFields label="Rovinieta" prefix="rovinieta" values={v} onChange={handleChange} />
          <DocFields label="ITP" prefix="itp" values={v} onChange={handleChange} />
          <DocFields label="Polita RCA" prefix="rca" values={v} onChange={handleChange} />
          <DocFields label="Polita Casco" prefix="casco" values={v} onChange={handleChange} />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-purple-600 uppercase tracking-widest mb-6 pb-2 border-b-2 border-purple-100 flex items-center gap-2">
          <Fuel className="w-4 h-4" /> Anvelope
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-3">
             <FormField label="Dimensiuni Anvelope" name="anvelope_dimensiuni" value={v.anvelope_dimensiuni} onChange={handleChange} placeholder="205/55 R16" />
          </div>
          <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-4">
            <p className="text-xs font-bold text-orange-700 uppercase">Vara</p>
            <FormField label="Data Achiziție" name="anvelope_vara_achizitie" type="date" value={v.anvelope_vara_achizitie} onChange={handleChange} />
            <FormField label="Data Schimbare" name="anvelope_vara_schimbare" type="date" value={v.anvelope_vara_schimbare} onChange={handleChange} />
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-4">
            <p className="text-xs font-bold text-blue-700 uppercase">Iarna</p>
            <FormField label="Data Achiziție" name="anvelope_iarna_achizitie" type="date" value={v.anvelope_iarna_achizitie} onChange={handleChange} />
            <FormField label="Data Schimbare" name="anvelope_iarna_schimbare" type="date" value={v.anvelope_iarna_schimbare} onChange={handleChange} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-8 border-t border-gray-100">
        <button 
          onClick={onCancel}
          className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
        >
          Anulează
        </button>
        <button 
          onClick={() => onSave(v)}
          className="px-8 py-2 bg-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          Salvează Vehicul
        </button>
      </div>
    </div>
  );
}

function FormField({ label, name, value, onChange, type = "text", placeholder, required }: any) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input 
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-gray-300"
      />
    </div>
  );
}

function DocFields({ label, prefix, values, onChange }: any) {
  return (
    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
        <Calendar className="w-3 h-3" /> {label}
      </p>
      <FormField label="Data Intocmire" name={`${prefix}_start`} type="date" value={values[`${prefix}_start`]} onChange={onChange} />
      <FormField label="Data Expirare" name={`${prefix}_expiry`} type="date" value={values[`${prefix}_expiry`]} onChange={onChange} />
    </div>
  );
}
