import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import { 
  Home, FileText, FolderKanban, User, Plus, Camera, Mic, 
  CloudRain, CheckCircle2, Clock, MapPin, AlertTriangle,
  ArrowLeft, Save, Users, Wrench, CloudSun, AlignLeft,
  PlusCircle, Trash2, Zap, RotateCcw, Image as ImageIcon,
  Search, ChevronRight, LogOut, Settings, Calendar, Edit2, Download,
  MessageSquare, X, UploadCloud, RefreshCw, FileEdit,
  Wifi, Database, Smartphone, Lock, Mail,
  Sun, Moon, WifiOff, FolderOpen, FileX, Square, BarChart3, ShieldCheck, List,
  Map, BellRing, Code2, ExternalLink, Eye, EyeOff, Key, Copy, ShieldAlert
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, enableIndexedDbPersistence, getDocs, query, where } from 'firebase/firestore';

// ==========================================
// 🔥 FIREBASE INITIALIZATION (VITE MODE)
// ==========================================
let app, auth, db, appId;
try {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  try {
    enableIndexedDbPersistence(db).catch((err) => {
      console.warn("Offline persistence error:", err.code);
    });
  } catch(e) {
    console.log("Persistence setup failed:", e);
  }
  
  appId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'default-app-id';
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// ==========================================
// 🛡️ ERROR BOUNDARY
// ==========================================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("ErrorBoundary menangkap error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-6 text-center bg-slate-50 dark:bg-slate-900">
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-3xl border border-red-200 dark:border-red-800 shadow-sm max-w-sm animate-slide-down">
            <AlertTriangle size={48} className="mx-auto mb-4 opacity-80" />
            <h2 className="font-bold text-lg mb-2">Terjadi Kesalahan Render</h2>
            <p className="text-xs mb-6 opacity-80 break-words">{this.state.error?.toString()}</p>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="bg-red-500 text-white px-6 py-3 rounded-xl text-sm font-bold shadow hover:bg-red-600 w-full">Reset & Muat Ulang</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// 📦 GLOBAL STATE MANAGEMENT (CONTEXT API)
// ==========================================
const StoreContext = createContext();
const useStore = () => useContext(StoreContext);

const StoreProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('dr_isAuthenticated') === 'true'); 
  const [currentPage, setCurrentPage] = useState(() => localStorage.getItem('dr_currentPage') || 'dashboard');
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('dr_activeTab') || 'home');
  const [showToast, setShowToast] = useState(false); 
  const [toastMessage, setToastMessage] = useState(''); 
  const [profilePic, setProfilePic] = useState(null);
  const [newReportScrollPos, setNewReportScrollPos] = useState(0);

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('dr_userProfile');
    return saved ? JSON.parse(saved) : { name: 'User', roleLabel: 'User', roleCode: 'user', companyName: 'Perusahaan Internal' };
  });

  const [selectedReport, setSelectedReport] = useState(null);

  const [draftReport, setDraftReport] = useState(() => {
    const saved = localStorage.getItem('dr_draftReport');
    return saved ? JSON.parse(saved) : {
      projectName: '', date: new Date().toISOString().split('T')[0], weatherMorning: 'Cerah', weatherAfternoon: 'Berawan', notes: '', manpower: [], equipment: []
    };
  });
  
  const [formErrors, setFormErrors] = useState({ projectName: false, notes: false });

  const [saveToGallery, setSaveToGallery] = useState(() => {
    const saved = localStorage.getItem('dr_saveToGallery');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [capturedPhotos, setCapturedPhotos] = useState(() => {
    const saved = localStorage.getItem('dr_capturedPhotos');
    return saved ? JSON.parse(saved) : [];
  });

  const [showCameraModal, setShowCameraModal] = useState(() => localStorage.getItem('dr_showCameraModal') === 'true');
  const [showVoiceNoteModal, setShowVoiceNoteModal] = useState(() => localStorage.getItem('dr_showVoiceNoteModal') === 'true');

  const [appSettings, setAppSettings] = useState(() => {
    const saved = localStorage.getItem('dr_appSettings');
    return saved ? JSON.parse(saved) : { syncWifiOnly: true, dailyReminder: true, reminderTime: '17:00', photoQuality: 'medium', theme: 'system' };
  });

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isAppLoading, setIsAppLoading] = useState(false);

  const [projectList, setProjectList] = useState([]);
  const [reports, setReports] = useState([]);
  const [accessCodesList, setAccessCodesList] = useState([]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth Error:", error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (currentUser && currentUser.displayName) {
        try {
          const savedProfile = JSON.parse(currentUser.displayName);
          if (savedProfile && savedProfile.roleCode) {
            setUserProfile(savedProfile);
            setIsAuthenticated(true);
            localStorage.setItem('dr_isAuthenticated', 'true');
          }
        } catch (e) {}
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'reports');
    const unsubReports = onSnapshot(reportsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ dbId: doc.id, isPending: doc.metadata.hasPendingWrites, ...doc.data() }));
      data.sort((a, b) => b.createdAt - a.createdAt);
      setReports(data);
    }, (error) => console.error("Reports fetch error:", error));

    const projectsRef = collection(db, 'artifacts', appId, 'public', 'data', 'projects');
    const unsubProjects = onSnapshot(projectsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ dbId: doc.id, ...doc.data() }));
      setProjectList(data);
    }, (error) => console.error("Projects fetch error:", error));

    const codesRef = collection(db, 'artifacts', appId, 'public', 'data', 'access_codes');
    const unsubCodes = onSnapshot(codesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ dbId: doc.id, ...doc.data() }));
      setAccessCodesList(data);
    }, (error) => console.error("Codes fetch error:", error));

    return () => { unsubReports(); unsubProjects(); unsubCodes(); };
  }, [user]);

  useEffect(() => localStorage.setItem('dr_userProfile', JSON.stringify(userProfile)), [userProfile]);
  useEffect(() => localStorage.setItem('dr_draftReport', JSON.stringify(draftReport)), [draftReport]);
  useEffect(() => localStorage.setItem('dr_saveToGallery', JSON.stringify(saveToGallery)), [saveToGallery]);
  useEffect(() => localStorage.setItem('dr_capturedPhotos', JSON.stringify(capturedPhotos)), [capturedPhotos]);
  useEffect(() => localStorage.setItem('dr_showCameraModal', showCameraModal), [showCameraModal]);
  useEffect(() => localStorage.setItem('dr_showVoiceNoteModal', showVoiceNoteModal), [showVoiceNoteModal]);
  useEffect(() => localStorage.setItem('dr_appSettings', JSON.stringify(appSettings)), [appSettings]);
  useEffect(() => localStorage.setItem('dr_isAuthenticated', isAuthenticated), [isAuthenticated]);
  useEffect(() => localStorage.setItem('dr_currentPage', currentPage), [currentPage]);
  useEffect(() => localStorage.setItem('dr_activeTab', activeTab), [activeTab]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const storeValue = useMemo(() => ({
    user, isAuthenticated, setIsAuthenticated, currentPage, setCurrentPage, activeTab, setActiveTab, showToast, setShowToast, toastMessage, setToastMessage, triggerToast,
    profilePic, setProfilePic, newReportScrollPos, setNewReportScrollPos, userProfile, setUserProfile, selectedReport, setSelectedReport,
    draftReport, setDraftReport, formErrors, setFormErrors, saveToGallery, setSaveToGallery, capturedPhotos, setCapturedPhotos,
    appSettings, setAppSettings, isOffline, isAppLoading, setIsAppLoading, projectList, setProjectList, reports, setReports,
    deferredPrompt, setDeferredPrompt, isInstallable, setIsInstallable, accessCodesList, setAccessCodesList,
    showCameraModal, setShowCameraModal, showVoiceNoteModal, setShowVoiceNoteModal
  }), [
    user, isAuthenticated, currentPage, activeTab, showToast, toastMessage, profilePic, newReportScrollPos, userProfile, selectedReport, draftReport, formErrors, saveToGallery, capturedPhotos, appSettings, isOffline, isAppLoading, projectList, reports, deferredPrompt, isInstallable, accessCodesList, showCameraModal, showVoiceNoteModal
  ]);

  return <StoreContext.Provider value={storeValue}>{children}</StoreContext.Provider>;
};

const SkeletonCard = () => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-pulse">
    <div className="flex justify-between items-center mb-3">
      <div className="flex items-center space-x-3"><div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded-full"></div><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div></div>
      <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
    </div>
    <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-2 ml-8"></div>
    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded ml-8"></div>
  </div>
);

// ==========================================
// 🌟 VIEWS (Dashboard, Profil, dll)
// ==========================================
const DashboardView = () => {
  const { activeTab, setActiveTab, userProfile, profilePic, setCurrentPage, draftReport, capturedPhotos, triggerToast, reports, setSelectedReport, appSettings, isAppLoading, user, setShowCameraModal } = useStore();
  const [todayDate, setTodayDate] = useState('');
  useEffect(() => setTodayDate(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })), []);

  const recentMyReports = reports.filter(r => r.userId === user?.uid).slice(0, 3);

  return (
    <div className="flex flex-col h-full relative bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-28">
        {activeTab === 'home' ? (
          <div className="animate-fade-in-up">
            <div className="bg-sky-600 dark:bg-sky-800 text-white p-6 rounded-b-3xl shadow-lg transition-colors duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full blur-3xl pointer-events-none transform translate-x-10 -translate-y-10"></div>
              <div className="flex justify-between items-center mb-6 relative z-10">
                <div><p className="text-sky-100 text-sm font-medium">Selamat Pagi,</p><h1 className="text-2xl font-bold tracking-tight">{userProfile.name}</h1></div>
                <button onClick={() => setActiveTab('profile')} className="bg-white/20 p-2 rounded-full backdrop-blur-sm hover:bg-white/30 transition-all duration-300 active:scale-90 hover:shadow-md">
                  {profilePic ? <img src={profilePic} alt="Profile" className="w-7 h-7 rounded-full object-cover" /> : <User size={24} />}
                </button>
              </div>
              <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between backdrop-blur-md border border-white/20 relative z-10 shadow-sm hover:bg-white/20 transition-colors cursor-default">
                <div className="flex items-center space-x-3"><CloudRain className="text-sky-200" size={28} /><div><p className="font-semibold text-lg leading-tight">Hujan Ringan</p><p className="text-xs text-sky-100">Jakarta Selatan, 24°C</p></div></div>
                <div className="text-right"><p className="text-sm font-medium">{todayDate}</p></div>
              </div>
            </div>

            <div className="px-6 mt-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 transition-colors">Aksi Cepat</h2>
              <div className="grid grid-cols-4 gap-3">
                <button onClick={() => setCurrentPage('new_report')} className="flex flex-col items-center bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-slate-700 active:scale-95 transition-all duration-300 hover:shadow-md hover:-translate-y-1 group">
                  <div className="bg-sky-100 dark:bg-sky-900/30 p-2.5 rounded-full mb-2 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform"><Plus size={20} /></div><span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight transition-colors">Lap. Baru</span>
                </button>
                <button onClick={() => setCurrentPage('new_report')} className="flex flex-col items-center bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-700 active:scale-95 transition-all duration-300 hover:shadow-md hover:-translate-y-1 relative group">
                  <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-full mb-2 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform"><FileEdit size={20} /></div><span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight transition-colors">Lanjut Draft</span>
                </button>
                <button onClick={() => triggerToast('Fitur Kamera Sedang Dimuat...')} className="flex flex-col items-center bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-slate-700 active:scale-95 transition-all duration-300 hover:shadow-md hover:-translate-y-1 relative group">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-2.5 rounded-full mb-2 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform"><Camera size={20} /></div><span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight transition-colors">Kamera</span>
                </button>
                <button onClick={() => triggerToast(appSettings.syncWifiOnly ? 'Menunggu Wi-Fi... 📶' : 'Sinkronisasi... 🔄')} className="flex flex-col items-center bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700 active:scale-95 transition-all duration-300 hover:shadow-md hover:-translate-y-1 group">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2.5 rounded-full mb-2 text-emerald-600 dark:text-emerald-400 group-hover:rotate-180 transition-transform duration-500"><RefreshCw size={20} /></div><span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight transition-colors">Sinkron</span>
                </button>
              </div>
            </div>

            <div className="px-6 mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 transition-colors">Laporan Terkini</h2>
                <button onClick={() => triggerToast('Buka menu Laporan untuk melihat semua')} className="text-sm text-sky-600 dark:text-sky-400 font-semibold hover:underline transition-colors">Lihat Semua</button>
              </div>
              <div className="space-y-4">
                {isAppLoading ? ( <><SkeletonCard /><SkeletonCard /></> ) : recentMyReports.map((report, index) => (
                  <div key={report.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-sky-300 dark:hover:border-sky-500 transition-all duration-300 hover:shadow-md active:scale-[0.98] animate-fade-in-up" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2"><MapPin size={16} className="text-slate-400" /><h3 className="font-bold text-slate-800 dark:text-slate-100 transition-colors">{report.projectName}</h3></div>
                      <span className="flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full transition-colors"><CheckCircle2 size={12} className="mr-1" /> Tersinkron</span>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 ml-6 transition-colors">
                      <p>ID: {report.id} | Cuaca: {report.weatherMorning}</p>
                    </div>
                  </div>
                ))}
                {recentMyReports.length === 0 && <p className="text-center text-xs text-slate-400 py-4">Belum ada laporan yang dibuat.</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-10 flex flex-col items-center justify-center h-full opacity-60">
            <Wrench size={48} className="mb-4 text-slate-400" />
            <p className="text-center text-sm font-bold">Fitur sedang dalam pengembangan.</p>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 w-full bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-4 rounded-b-[2.5rem] z-50 print:hidden transition-colors duration-300">
        <div className="flex justify-between items-center">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center p-2 transition-all duration-300 group ${activeTab === 'home' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}><Home size={24} /><span className="text-[10px] font-semibold mt-1">Beranda</span></button>
          <button onClick={() => triggerToast('Menu Laporan diklik')} className={`flex flex-col items-center p-2 transition-all duration-300 group ${activeTab === 'reports' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}><FileText size={24} /><span className="text-[10px] font-semibold mt-1">Laporan</span></button>
          <div className="relative -top-8"><button onClick={() => triggerToast('Laporan Baru!')} className="bg-sky-600 dark:bg-sky-500 text-white p-4 rounded-full shadow-lg hover:bg-sky-700 dark:hover:bg-sky-600 active:scale-90 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl"><Plus size={28} /></button></div>
          <button onClick={() => triggerToast('Menu Proyek diklik')} className={`flex flex-col items-center p-2 transition-all duration-300 group ${activeTab === 'projects' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}><FolderKanban size={24} /><span className="text-[10px] font-semibold mt-1">Proyek</span></button>
          <button onClick={() => triggerToast('Menu Profil diklik')} className={`flex flex-col items-center p-2 transition-all duration-300 group ${activeTab === 'profile' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}><User size={24} /><span className="text-[10px] font-semibold mt-1">Profil</span></button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 📈 ADMIN DASHBOARD VIEW (DENGAN GRAFIK & LISENSI)
// ==========================================
const AdminDashboardView = () => {
  const { reports, projectList, setIsAuthenticated, triggerToast, setCurrentPage, accessCodesList, setAccessCodesList, userProfile, auth } = useStore();
  
  const [adminTab, setAdminTab] = useState('overview'); 
  const [selectedAdminReport, setSelectedAdminReport] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('Semua Proyek');

  const [newLicenseForm, setNewLicenseForm] = useState({ companyName: '', role: 'user', code: '' });
  const [isGenerating, setIsGenerating] = useState(false);

  const adminCompanyReports = useMemo(() => {
    if (userProfile?.companyName === 'Developer Internal') return reports;
    return reports.filter(r => r.companyName === userProfile?.companyName);
  }, [reports, userProfile]);

  const adminCompanyProjects = useMemo(() => {
    if (userProfile?.companyName === 'Developer Internal') return projectList;
    return projectList.filter(p => !p.companyName || p.companyName === userProfile?.companyName);
  }, [projectList, userProfile]);

  const visibleCodes = useMemo(() => {
    if (userProfile?.companyName === 'Developer Internal') return accessCodesList;
    return accessCodesList.filter(c => c.companyName === userProfile?.companyName);
  }, [accessCodesList, userProfile]);
  
  const generateRandomCode = () => {
    const prefix = newLicenseForm.role === 'admin' ? 'ADM' : 'USR';
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newCode = `${prefix}-${randomStr}-${Math.floor(Math.random() * 99)}`;
    setNewLicenseForm(prev => ({ ...prev, code: newCode }));
  };

  const handleCreateLicense = async (e) => {
    e.preventDefault();
    if (!newLicenseForm.companyName || !newLicenseForm.code) {
      triggerToast('⚠️ Lengkapi nama perusahaan dan buat kode!');
      return;
    }
    setIsGenerating(true);
    
    try {
      // MENGIRIM DATA ASLI KE FIRESTORE CLOUD! ☁️
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'access_codes'), {
        companyName: newLicenseForm.companyName,
        role: newLicenseForm.role,
        code: newLicenseForm.code,
        createdAt: Date.now()
      });
      
      triggerToast('✅ Lisensi baru berhasil mendarat di Cloud Firestore!');
      setNewLicenseForm({ companyName: '', role: 'user', code: '' });
    } catch (error) {
      console.error("Error saving to Firestore:", error);
      triggerToast('❌ Gagal menyimpan ke database awan.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteLicense = async (dbId) => {
    if (window.confirm('Yakin ingin mencabut lisensi ini?')) {
      try {
        // MENGHAPUS DATA ASLI DARI FIRESTORE CLOUD! ☁️
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'access_codes', dbId));
        triggerToast('🗑️ Lisensi berhasil dihapus dari Cloud.');
      } catch (error) {
        triggerToast('❌ Gagal menghapus lisensi.');
      }
    }
  };

  const copyToClipboard = (text) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
      triggerToast('📋 Kode disalin ke clipboard!');
    } catch (err) {
      triggerToast('⚠️ Gagal menyalin teks.');
    }
  };
  
  const filteredReports = useMemo(() => {
    return adminCompanyReports.filter(r => {
      const matchSearch = r.id.toLowerCase().includes(searchQuery.toLowerCase()) || (r.authorName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchProject = filterProject === 'Semua Proyek' ? true : r.projectName === filterProject;
      return matchSearch && matchProject;
    });
  }, [adminCompanyReports, searchQuery, filterProject]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative transition-colors duration-300 animate-slide-in-right">
      <div className="bg-indigo-600 dark:bg-indigo-800 text-white p-6 rounded-b-3xl shadow-lg transition-colors duration-300">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center"><ShieldCheck size={24} className="mr-2" /><h1 className="text-xl font-bold">Admin Panel</h1></div>
          <button onClick={async () => { 
            localStorage.removeItem('dr_isAuthenticated');
            setIsAuthenticated(false); 
            setCurrentPage('dashboard'); 
          }} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all"><LogOut size={16} /></button>
        </div>
        
        <div className="flex space-x-2 mt-4 bg-indigo-700/50 p-1 rounded-xl">
          <button onClick={() => setAdminTab('overview')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${adminTab === 'overview' ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-100 hover:bg-indigo-700/50'}`}>Data Laporan</button>
          <button onClick={() => setAdminTab('licenses')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${adminTab === 'licenses' ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-100 hover:bg-indigo-700/50'}`}>Lisensi Klien</button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-10">
        {adminTab === 'overview' ? (
          <div className="animate-fade-in-up">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center text-indigo-500 mb-2"><FileText size={20} className="mr-2" /><span className="font-bold text-xs">Total Laporan</span></div>
                <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{adminCompanyReports.length}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center text-emerald-500 mb-2"><FolderKanban size={20} className="mr-2" /><span className="font-bold text-xs">Total Proyek</span></div>
                <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{adminCompanyProjects.length}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center"><BarChart3 size={18} className="mr-2 text-indigo-500"/> Distribusi Laporan per Proyek</h2>
              <div className="flex items-end h-32 space-x-3 border-b border-slate-200 dark:border-slate-700 pb-2">
                {/* Dummy Chart for Display */}
                <div className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className="text-[10px] font-bold text-indigo-600 mb-1">5</span>
                  <div className="w-full rounded-t-md bg-indigo-500 h-[80%]"></div>
                  <span className="text-[8px] text-slate-500 truncate w-full text-center mt-2 font-semibold">Proyek A</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className="text-[10px] font-bold text-indigo-600 mb-1">2</span>
                  <div className="w-full rounded-t-md bg-indigo-500 h-[40%]"></div>
                  <span className="text-[8px] text-slate-500 truncate w-full text-center mt-2 font-semibold">Proyek B</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-end h-full group">
                  <span className="text-[10px] font-bold text-indigo-600 mb-1">0</span>
                  <div className="w-full rounded-t-md bg-slate-200 h-[10%]"></div>
                  <span className="text-[8px] text-slate-500 truncate w-full text-center mt-2 font-semibold">Proyek C</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-slate-800 flex items-center"><List size={18} className="mr-2 text-slate-400"/> Pencarian Laporan</h2>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-center text-slate-400 py-4">Laporan belum ada atau masih dimuat dari Firebase.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center border-b border-slate-100 dark:border-slate-700 pb-3"><Key size={18} className="mr-2 text-amber-500"/> Terbitkan Kode Lisensi Baru</h2>
              <form onSubmit={handleCreateLicense} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nama Perusahaan Klien</label>
                  <input type="text" placeholder="Misal: PT. Konstruksi Bangsa" value={newLicenseForm.companyName} onChange={(e) => setNewLicenseForm({...newLicenseForm, companyName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Tipe Akses</label>
                    <select value={newLicenseForm.role} onChange={(e) => setNewLicenseForm({...newLicenseForm, role: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all">
                      <option value="user">User / Mandor</option>
                      <option value="admin">Admin Pusat</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block flex justify-between">
                      <span>Kode Rahasia</span>
                      <button type="button" onClick={generateRandomCode} className="text-indigo-600 hover:underline">Generate</button>
                    </label>
                    <input type="text" placeholder="Generate kode..." value={newLicenseForm.code} onChange={(e) => setNewLicenseForm({...newLicenseForm, code: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all uppercase font-mono" />
                  </div>
                </div>
                <button type="submit" disabled={isGenerating} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center">
                  {isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <><Plus size={18} className="mr-2"/> Terbitkan Lisensi</>}
                </button>
              </form>
            </div>

            {/* KODE YANG KETINGGALAN: Daftar Lisensi yang Aktif */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center border-b border-slate-100 dark:border-slate-700 pb-3"><ShieldAlert size={18} className="mr-2 text-emerald-500"/> Lisensi Aktif ({visibleCodes.length})</h2>
              
              <div className="space-y-3">
                {visibleCodes.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Belum ada lisensi yang diterbitkan.</p>
                ) : (
                  visibleCodes.map((license) => (
                    <div key={license.dbId} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div className="overflow-hidden">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate pr-2">{license.companyName}</h3>
                        <div className="flex items-center mt-1">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase mr-2 ${license.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-sky-100 text-sky-600'}`}>
                            {license.role}
                          </span>
                          <span className="text-xs font-mono text-slate-600 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded cursor-pointer hover:bg-slate-300 transition" onClick={() => copyToClipboard(license.code)} title="Klik untuk copy">
                            {license.code} <Copy size={10} className="inline ml-1 opacity-50"/>
                          </span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteLicense(license.dbId)} className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0 active:scale-90">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        <div className="pt-8 pb-4 flex flex-col items-center justify-center opacity-70">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">System Architect</p>
          <p className="text-xs font-black text-indigo-600 tracking-widest">ADIPRAMONOSN</p>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 🔑 LOGIN VIEW
// ==========================================
const LoginView = () => {
  const { setUserProfile, setIsAuthenticated, triggerToast, isAppLoading } = useStore();
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative justify-center px-8 animate-fade-in overflow-hidden transition-colors duration-300">
      <div className="absolute top-0 left-0 w-full h-72 bg-sky-600 dark:bg-sky-800 rounded-b-[4rem] z-0"></div>
      <div className="relative z-10 flex flex-col items-center mb-8 mt-12 animate-slide-down">
        <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center mb-4 border-b-4 border-sky-200"><Wrench size={40} className="text-sky-600" /></div>
        <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">DailyReports</h1>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 relative z-10 animate-fade-in-up">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Masuk ke Akunmu</h2>
        <form onSubmit={(e) => { 
          e.preventDefault(); 
          setIsSubmitting(true);
          
          setTimeout(() => {
            if (accessCode === 'DEV-ADMIN-99') {
              setUserProfile({ name: email.split('@')[0].toUpperCase() || 'ADMIN', roleCode: 'admin', roleLabel: 'Administrator Pusat', companyName: 'Developer Internal' });
              setIsAuthenticated(true);
              triggerToast('Akses Diberikan! Selamat bekerja di Developer Internal! ☁️');
            } else if (accessCode.startsWith('USR-')) {
              setUserProfile({ name: email.split('@')[0].toUpperCase() || 'USER', roleCode: 'user', roleLabel: 'User', companyName: 'Perusahaan Prototype' });
              setIsAuthenticated(true);
              triggerToast('Akses Diberikan! Selamat bekerja! ☁️');
            } else {
              triggerToast('❌ Kode Akses salah atau tidak terdaftar!');
            }
            setIsSubmitting(false);
          }, 1000);
        }} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Email / ID Pegawai</label>
            <div className="relative"><Mail size={18} className="absolute left-3 top-3.5 text-slate-400" /><input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="budi.user@proyek.com" className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-3 rounded-xl text-sm" required /></div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center justify-between">
              <span>Kode Akses Developer</span>
              <Lock size={12} className="text-sky-500"/>
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-3.5 text-slate-400" />
              <input type={showAccessCode ? "text" : "password"} value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="Masukkan kode lisensi..." className="w-full bg-slate-50 border border-slate-200 pl-10 pr-12 py-3 rounded-xl text-sm" required />
              <button type="button" onClick={() => setShowAccessCode(!showAccessCode)} className="absolute right-3 top-3 text-slate-400 hover:text-sky-500 transition-colors focus:outline-none">
                {showAccessCode ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className={`w-full py-4 rounded-xl font-bold text-sm text-white transition-all shadow-lg ${isSubmitting ? 'bg-sky-400 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 active:scale-95'}`}>{isSubmitting ? <RefreshCw size={20} className="animate-spin mx-auto" /> : 'Verifikasi & Masuk'}</button>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 🌟 ISTANA UTAMA (CONTROLLER)
// ==========================================
const AppContent = () => {
  const { isAuthenticated, currentPage, showToast, toastMessage, isOffline, appSettings, userProfile } = useStore();
  
  return (
    <>
      <style>{`
        @keyframes fadeInUpSmooth { 0% { opacity: 0; transform: translateY(15px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRightSmooth { 0% { opacity: 0; transform: translateX(20px); } 100% { opacity: 1; transform: translateX(0); } }
        @keyframes slideDownSmooth { 0% { opacity: 0; transform: translateY(-20px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUpSmooth 0.5s forwards; }
        .animate-slide-in-right { animation: slideInRightSmooth 0.4s forwards; }
        .animate-slide-down { animation: slideDownSmooth 0.4s forwards; }
      `}</style>

      <div className="max-w-md mx-auto h-[850px] relative overflow-hidden font-sans shadow-2xl sm:rounded-[2.5rem] sm:border-8 border-slate-800 my-4 flex flex-col bg-slate-50 text-slate-800">
        <ErrorBoundary>
          {!isAuthenticated ? <LoginView /> : (
            <div className="flex flex-col flex-1 h-full overflow-hidden relative bg-slate-50">
              {userProfile?.roleCode === 'admin' ? (
                <AdminDashboardView />
              ) : (
                <>
                  {currentPage === 'dashboard' && <DashboardView />}
                  {/* Komponen lain yang kamu bangun akan merender di sini */}
                </>
              )}
            </div>
          )}

          {showToast && (
            <div className="absolute top-10 left-10 right-10 flex justify-center z-[110] pointer-events-none">
              <div className="bg-slate-800 text-white px-5 py-3 rounded-full shadow-2xl flex items-center space-x-2 border border-slate-700 animate-slide-down">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span className="text-xs font-bold">{toastMessage}</span>
              </div>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}