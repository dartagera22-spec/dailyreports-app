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
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, enableIndexedDbPersistence, getDocs } from 'firebase/firestore';

// ==========================================
// 🔥 FIREBASE INITIALIZATION
// ==========================================
let app, auth, db, appId;
try {
  const firebaseConfig = {
VITE_FIREBASE_API_KEY="AIzaSyA6hU6L-OC0tcBgwLNe8R8uh1SDQMZWruY"
VITE_FIREBASE_AUTH_DOMAIN="device-streaming-5484e59f.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="device-streaming-5484e59f"
VITE_FIREBASE_STORAGE_BUCKET="device-streaming-5484e59f.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="919090158324"
VITE_FIREBASE_APP_ID="1:919090158324:web:87809df26c349b004d9ca1"}
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Offline persistence (Brankas Offline)
  try {
    enableIndexedDbPersistence(db).catch((err) => {
      console.warn("Offline persistence error:", err.code);
    });
  } catch(e) {
    console.log("Persistence setup failed:", e);
  }
  
  appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// ==========================================
// 🛡️ ERROR BOUNDARY (Penjaga Crash)
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
            <p className="text-xs mb-6 opacity-80 break-words">{this.state.error?.toString() || "Objek tidak valid sebagai React Child."}</p>
            <button onClick={() => this.setState({ hasError: false })} className="bg-red-500 text-white px-6 py-3 rounded-xl text-sm font-bold shadow hover:bg-red-600 active:scale-95 transition-all w-full">Muat Ulang Tampilan</button>
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
    return saved ? JSON.parse(saved) : { name: 'Budi Santoso', roleLabel: 'User', roleCode: 'user', companyName: 'Perusahaan Internal' };
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
  const [isAppLoading, setIsAppLoading] = useState(true);

  const [projectList, setProjectList] = useState([]);
  const [reports, setReports] = useState([]);
  const [accessCodesList, setAccessCodesList] = useState([]);

  // Auth Initialization Effect
  useEffect(() => {
    if (!auth) {
      console.warn("Auth Firebase gagal diinisialisasi. Mode Offline Fallback aktif.");
      setIsAppLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
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
        } catch (e) {
          console.error("Gagal membaca profil dari Firebase", e);
        }
      }
      setIsAppLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Database Fetching Effect (Only runs when user is authenticated)
  useEffect(() => {
    if (!user || !db) return;
    
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

  useEffect(() => {
    if (!isAuthenticated) return;
    
    if (appSettings.dailyReminder && 'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      if (!appSettings.dailyReminder) return;
      const now = new Date();
      const currentHourMin = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentHourMin === appSettings.reminderTime && now.getSeconds() === 0) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('DailyReports', { 
            body: 'Waktunya pulang! Jangan lupa pastikan semua laporan hari ini tersinkronisasi.', 
            icon: 'https://cdn-icons-png.flaticon.com/512/3256/3256783.png'
          });
        } else {
          triggerToast('⏰ Waktunya sinkronkan laporan sebelum pulang!');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [appSettings.dailyReminder, appSettings.reminderTime, isAuthenticated]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      triggerToast('Aplikasi berhasil diinstal di Home Screen! 🎉');
    });
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const handleOnline = () => { setIsOffline(false); if (isAuthenticated) triggerToast('Koneksi pulih! Menyinkronkan data tertunda ke Cloud... ☁️✨'); };
    const handleOffline = () => { setIsOffline(true); if (isAuthenticated) triggerToast('Koneksi terputus. Mode Brankas Offline Aktif. 📴'); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [isAuthenticated]);

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
// 🌟 VIEWS 
// ==========================================
const ReportsHistoryContent = () => {
  const { reports, setSelectedReport, setCurrentPage, isAppLoading, user } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState(''); 

  const filteredReports = useMemo(() => {
    const myReports = reports.filter(r => r.userId === user?.uid);
    return myReports.filter(report => {
      const matchesSearch = report.projectName.toLowerCase().includes(searchQuery.toLowerCase()) || report.id.toLowerCase().includes(searchQuery.toLowerCase());
      const reportStatus = report.isPending ? 'pending' : 'synced';
      const matchesFilter = filterStatus === 'all' ? true : reportStatus === filterStatus;
      let matchesDate = true;
      if (filterDate) {
        const formattedFilterDate = new Date(filterDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        matchesDate = report.date === formattedFilterDate;
      }
      return matchesSearch && matchesFilter && matchesDate;
    });
  }, [reports, searchQuery, filterStatus, filterDate, user]);

  return (
    <div className="flex flex-col h-full animate-fade-in-up transition-colors duration-300">
      <div className="bg-sky-600 dark:bg-sky-800 text-white p-6 rounded-b-3xl shadow-lg transition-colors duration-300">
        <h1 className="text-2xl font-bold mt-2">Riwayat Laporan</h1>
        <p className="text-sky-100 text-sm">Arsip dan status sinkronisasi datamu</p>
      </div>
      
      <div className="px-6 mt-6 space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
          <input type="text" placeholder="Cari proyek atau ID laporan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 p-3 pl-10 rounded-xl text-sm focus:ring-sky-500 focus:border-sky-500 shadow-sm transition-all duration-300" />
        </div>
        <div className="relative">
          <Calendar size={18} className="absolute left-3 top-3.5 text-slate-400" />
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 p-3 pl-10 rounded-xl text-sm focus:ring-sky-500 focus:border-sky-500 shadow-sm transition-all duration-300" />
        </div>
        <div className="flex space-x-2 pt-1 overflow-x-auto hide-scrollbar pb-2">
          <button onClick={() => setFilterStatus('all')} className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-md shrink-0 transition-all duration-300 ${filterStatus === 'all' ? 'bg-sky-600 text-white dark:bg-sky-500 transform scale-105' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95'}`}>Semua</button>
          <button onClick={() => setFilterStatus('synced')} className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm shrink-0 transition-all duration-300 ${filterStatus === 'synced' ? 'bg-emerald-600 text-white transform scale-105' : 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 active:scale-95'}`}>Tersinkron</button>
          <button onClick={() => setFilterStatus('pending')} className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm shrink-0 transition-all duration-300 ${filterStatus === 'pending' ? 'bg-amber-500 text-white transform scale-105' : 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-500 border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/30 active:scale-95'}`}>Tertunda</button>
        </div>
      </div>

      <div className="px-6 mt-2 pb-6 space-y-4 relative">
        {isAppLoading ? ( <><SkeletonCard /><SkeletonCard /><SkeletonCard /></> ) : filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center opacity-80 mt-10 animate-fade-in-up">
            <div className="bg-slate-200 dark:bg-slate-800 p-5 rounded-full mb-4"><FileX size={40} className="text-slate-400 dark:text-slate-500" /></div>
            <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Belum Ada Laporan</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Laporan yang cocok dengan pencarianmu tidak ditemukan.</p>
          </div>
        ) : (
          filteredReports.map((report, index) => (
            <div key={report.id} onClick={() => { setSelectedReport(report); setCurrentPage('report_detail'); }} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col hover:border-sky-300 dark:hover:border-sky-500 hover:shadow-md transition-all duration-300 cursor-pointer active:scale-[0.98] animate-fade-in-up" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2"><FileText size={16} className="text-sky-500 dark:text-sky-400" /><h3 className="font-bold text-slate-800 dark:text-slate-100">{report.projectName}</h3></div>
                {!report.isPending ? (
                  <span className="flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full"><CheckCircle2 size={12} className="mr-1" />Tersinkron</span>
                ) : (
                  <span className="flex items-center text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-full"><Clock size={12} className="mr-1" />Antre di Cloud</span>
                )}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 ml-6">
                <p className="font-medium text-slate-700 dark:text-slate-300">{report.id}</p>
                <p className="text-xs mt-1">Tanggal: {report.date} | Cuaca: {report.weatherMorning}</p>
                {report.notes && <p className="text-[10px] mt-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-700 italic truncate text-slate-600 dark:text-slate-400 transition-colors duration-300">"{report.notes}"</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ProjectsContent = () => {
  const { projectList, isAppLoading, userProfile } = useStore();
  
  const myProjects = useMemo(() => {
    if (userProfile?.companyName === 'Developer Internal') return projectList;
    return projectList.filter(p => !p.companyName || p.companyName === userProfile?.companyName);
  }, [projectList, userProfile]);

  return (
    <div className="flex flex-col h-full animate-fade-in-up transition-colors duration-300">
      <div className="bg-sky-600 dark:bg-sky-800 text-white p-6 rounded-b-3xl shadow-lg transition-colors duration-300">
        <h1 className="text-2xl font-bold mt-2">Daftar Proyek</h1>
        <p className="text-sky-100 text-sm">Proyek yang ditugaskan kepadamu</p>
      </div>
      <div className="px-6 mt-6 space-y-4 pb-6">
        {isAppLoading ? ( <><SkeletonCard /><SkeletonCard /></> ) : myProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center opacity-80 mt-10 animate-fade-in-up">
            <div className="bg-slate-200 dark:bg-slate-800 p-5 rounded-full mb-4"><FolderOpen size={40} className="text-slate-400 dark:text-slate-500" /></div>
            <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-1">Belum Ada Proyek</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Data proyek yang aktif akan muncul di sini.</p>
          </div>
        ) : (
          myProjects.map((proj, index) => (
            <div key={proj.id} className={`bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 animate-fade-in-up cursor-default ${proj.status === 'active' ? 'border-sky-200 dark:border-sky-800' : 'border-slate-100 dark:border-slate-700 opacity-70'}`} style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">{proj.name}</h3>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${proj.status === 'active' ? 'text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-900/30' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700'}`}>{proj.status === 'active' ? 'Aktif' : 'Selesai'}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center"><MapPin size={12} className="mr-1"/> {proj.address}</p>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-1 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ease-out ${proj.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-500'}`} style={{width: `${proj.progress}%`}}></div>
              </div>
              <p className="text-[10px] text-right text-slate-400 font-medium">Progress: {proj.progress}%</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ProfileContent = () => {
  const { userProfile, reports, projectList, profilePic, setProfilePic, saveToGallery, setSaveToGallery, triggerToast, setCurrentPage, setIsAuthenticated } = useStore();
  const fileInputRef = useRef(null);

  const handleProfilePicChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const imageUrl = URL.createObjectURL(e.target.files[0]);
      setProfilePic(imageUrl);
      triggerToast('Foto profil berhasil diubah! 👤');
    }
  };

  const myProjectsCount = useMemo(() => {
    if (userProfile?.companyName === 'Developer Internal') return projectList.filter(p => p.status === 'completed').length;
    return projectList.filter(p => p.status === 'completed' && (!p.companyName || p.companyName === userProfile?.companyName)).length;
  }, [projectList, userProfile]);

  return (
    <div className="flex flex-col h-full animate-fade-in-up transition-colors duration-300">
      <div className="bg-sky-600 dark:bg-sky-800 text-white p-6 rounded-b-3xl shadow-lg flex flex-col items-center pt-10 transition-colors duration-300 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-black opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg mb-4 border-4 border-sky-300 dark:border-sky-600 relative cursor-pointer overflow-hidden group transition-all duration-300 hover:scale-105 z-10" onClick={() => fileInputRef.current?.click()}>
          {profilePic ? <img src={profilePic} alt="Profile" className="w-full h-full object-cover" /> : <User size={48} className="text-sky-300 dark:text-sky-600" />}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"><Camera size={24} className="text-white drop-shadow-md" /></div>
        </div>
        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleProfilePicChange} />
        <h1 className="text-2xl font-bold z-10 drop-shadow-sm mt-1">{userProfile.name}</h1>
        
        <div className="flex items-center justify-center space-x-2 mt-3 z-10">
          <span className="text-sky-100 dark:text-sky-200 text-[11px] font-bold bg-sky-700/50 dark:bg-sky-900/50 px-3 py-1.5 rounded-full shadow-sm">{userProfile.roleLabel}</span>
          <span className="text-amber-100 dark:text-amber-200 text-[11px] font-bold bg-amber-500/40 dark:bg-amber-600/40 px-3 py-1.5 rounded-full shadow-sm flex items-center">
            <ShieldCheck size={12} className="mr-1 opacity-80" /> {userProfile.companyName || 'Perusahaan Internal'}
          </span>
        </div>
      </div>
      
      <div className="px-6 mt-6 pb-6">
        <div className="flex justify-around bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6 transition-colors duration-300">
          <div className="text-center"><p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{reports.length}</p><p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Laporan</p></div>
          <div className="w-px bg-slate-100 dark:bg-slate-700"></div>
          <div className="text-center"><p className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{myProjectsCount}</p><p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Proyek Selesai</p></div>
        </div>
        
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 ml-2">Pengaturan Akun</h3>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors duration-300">
          <div className="w-full flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer active:bg-slate-100 dark:active:bg-slate-700" onClick={() => { setSaveToGallery(!saveToGallery); triggerToast(!saveToGallery ? 'Fitur simpan ke Galeri HP diaktifkan! 📱' : 'Penyimpanan ke Galeri HP dimatikan.'); }}>
            <div className="flex flex-col">
              <div className="flex items-center text-sm text-slate-700 dark:text-slate-200 font-bold transition-colors"><ImageIcon size={18} className="mr-3 text-sky-500 dark:text-sky-400"/> Simpan ke Galeri HP</div>
              <p className="text-[10px] text-slate-400 mt-1 ml-7">Salin foto otomatis ke memori internal</p>
            </div>
            <button className={`w-10 h-5 rounded-full relative transition-colors duration-300 shrink-0 ${saveToGallery ? 'emerald-500 shadow-inner' : 'bg-slate-300 dark:bg-slate-600 shadow-inner'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-300 ease-out shadow-sm ${saveToGallery ? 'translate-x-5' : 'translate-x-1'}`}></div></button>
          </div>
          <button onClick={() => setCurrentPage('settings')} className="w-full flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition active:bg-slate-100 dark:active:bg-slate-700">
            <div className="flex items-center text-sm text-slate-700 dark:text-slate-200 font-medium transition-colors"><Settings size={18} className="mr-3 text-slate-400 dark:text-slate-500"/> Pengaturan Aplikasi</div>
            <ChevronRight size={16} className="text-slate-300 dark:text-slate-500 transition-colors"/>
          </button>
          <button onClick={async () => { 
            triggerToast('Meninggalkan sistem... 👋'); 
            
            if (auth && auth.currentUser) {
              await updateProfile(auth.currentUser, { displayName: "" }).catch(()=>{});
            }
            
            setTimeout(() => { 
              localStorage.removeItem('dr_isAuthenticated');
              setIsAuthenticated(false); 
              setCurrentPage('dashboard'); 
            }, 1000); 
          }} className="w-full flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-900/30 transition active:bg-red-100 dark:active:bg-red-900/50">
            <div className="flex items-center text-sm text-red-600 dark:text-red-400 font-bold transition-colors"><LogOut size={18} className="mr-3"/> Keluar (Logout)</div>
          </button>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center opacity-70 pb-4">
          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Developed & Crafted By</p>
          <div className="bg-sky-100/50 dark:bg-sky-900/30 px-4 py-1.5 rounded-full border border-sky-200 dark:border-sky-800 transition-colors duration-300 shadow-sm">
            <p className="text-xs font-black text-sky-700 dark:text-sky-400 tracking-widest">ADIPRAMONOSN</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsView = () => {
  const { appSettings, setAppSettings, setCurrentPage, triggerToast, isInstallable, deferredPrompt, setIsInstallable, setDeferredPrompt } = useStore();
  const updateAppSettings = (key, value) => setAppSettings(prev => ({ ...prev, [key]: value }));
  const handleClearCache = () => {
    triggerToast('🧹 Membersihkan file sementara & data lokal...');
    setTimeout(() => { localStorage.clear(); triggerToast('✨ Cache berhasil dibersihkan! Memuat ulang aplikasi...'); setTimeout(() => window.location.reload(), 1500); }, 1500);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative transition-colors duration-300 animate-slide-in-right">
      <div className="bg-sky-600 dark:bg-sky-800 text-white p-4 pt-6 rounded-b-2xl shadow-md z-10 sticky top-0 transition-colors duration-300">
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentPage('dashboard')} className="p-2 bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition-all active:scale-95 hover:-translate-x-1"><ArrowLeft size={20} /></button>
          <h1 className="text-lg font-bold">Pengaturan</h1>
          <div className="w-9"></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-28 space-y-6">
        {isInstallable && (
          <div className="bg-gradient-to-br from-sky-500 to-indigo-600 p-4 rounded-2xl shadow-lg text-white flex justify-between items-center relative overflow-hidden animate-fade-in-up">
            <div className="absolute -right-4 -top-4 text-white/10"><Smartphone size={80} /></div>
            <div className="relative z-10">
              <h2 className="font-bold text-sm mb-1 flex items-center"><Download size={14} className="mr-1.5"/> Install DailyReports</h2>
              <p className="text-[10px] text-sky-100 max-w-[180px]">Tambahkan ke Home Screen untuk akses lebih cepat bagai aplikasi asli.</p>
            </div>
            <button onClick={handleInstallClick} className="relative z-10 bg-white text-sky-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all">Install</button>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
          <h2 className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-4 flex items-center"><Smartphone size={14} className="mr-2"/> Tampilan Tema</h2>
          <div className="flex p-1 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors duration-300 relative">
            {['light', 'dark', 'system'].map((t) => (
              <button key={t} onClick={() => updateAppSettings('theme', t)} className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-xs font-bold transition-all duration-300 z-10 ${appSettings.theme === t ? 'bg-white dark:bg-slate-800 shadow-sm text-sky-600 dark:text-sky-400 transform scale-[1.02]' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/50'}`}>
                {t === 'light' ? <Sun size={14} className="mr-1.5"/> : t === 'dark' ? <Moon size={14} className="mr-1.5"/> : <Smartphone size={14} className="mr-1.5"/>}
                {t === 'light' ? 'Terang' : t === 'dark' ? 'Gelap' : 'Auto'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
          <h2 className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-4 flex items-center"><Wifi size={14} className="mr-2"/> Jaringan & Data</h2>
          <div className="flex items-center justify-between mb-4 cursor-pointer group" onClick={() => updateAppSettings('syncWifiOnly', !appSettings.syncWifiOnly)}>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 transition-colors">Sinkronisasi via Wi-Fi Saja</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 w-4/5 transition-colors">Tunda upload foto besar saat pakai data seluler.</p>
            </div>
            <button className={`w-10 h-5 rounded-full relative transition-colors duration-300 shrink-0 shadow-inner ${appSettings.syncWifiOnly ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-300 ease-out shadow-sm ${appSettings.syncWifiOnly ? 'translate-x-5' : 'translate-x-1'}`}></div></button>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-700 pt-4 transition-colors">
            <button onClick={handleClearCache} className="w-full flex items-center justify-between group active:scale-[0.98] transition-transform">
              <div className="flex flex-col text-left"><p className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">Bersihkan Data Cache</p><p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 transition-colors">Kosongkan ruang memori HP (Aman).</p></div>
              <Database size={18} className="text-slate-400 dark:text-slate-500 group-hover:text-sky-500 transition-colors" />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
          <h2 className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-4 flex items-center"><Camera size={14} className="mr-2"/> Kamera & Resolusi (Auto-Compress)</h2>
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Kualitas Unggahan Foto</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">Semakin rendah, memori HP semakin lega.</p>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {['low', 'medium', 'high'].map(q => (
                <button key={q} onClick={() => updateAppSettings('photoQuality', q)} className={`py-2 px-1 rounded-lg text-xs font-bold transition-all duration-300 ${appSettings.photoQuality === q ? 'bg-sky-50 dark:bg-sky-900/30 border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-400 shadow-sm transform scale-[1.02]' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                  {q === 'low' ? 'Rendah' : q === 'medium' ? 'Sedang' : 'Tinggi'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
                <button onClick={() => setActiveTab('profile')} className="bg-white/20 p-2 rounded-full backdrop-blur-sm hover:bg-white/30 transition-all duration-300 active:scale-90 hover:shadow-md overflow-hidden ring-2 ring-transparent hover:ring-sky-300">
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
                  {(draftReport.notes || capturedPhotos.length > 0) && <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></div>}
                </button>
                <button onClick={() => { setCurrentPage('new_report'); setShowCameraModal(true); }} className="flex flex-col items-center bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-slate-700 active:scale-95 transition-all duration-300 hover:shadow-md hover:-translate-y-1 relative group">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-2.5 rounded-full mb-2 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform"><Camera size={20} /></div><span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight transition-colors">Kamera</span>
                </button>
                <button onClick={() => triggerToast(appSettings.syncWifiOnly ? 'Menunggu Wi-Fi untuk Sinkronisasi... 📶' : 'Sinkronisasi berjalan via Seluler... 🔄')} className="flex flex-col items-center bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700 active:scale-95 transition-all duration-300 hover:shadow-md hover:-translate-y-1 group">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2.5 rounded-full mb-2 text-emerald-600 dark:text-emerald-400 group-hover:rotate-180 transition-transform duration-500"><RefreshCw size={20} /></div><span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight transition-colors">Sinkron</span>
                </button>
              </div>
            </div>

            <div className="px-6 mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 transition-colors">Laporan Terkini</h2>
                <button onClick={() => setActiveTab('reports')} className="text-sm text-sky-600 dark:text-sky-400 font-semibold hover:underline transition-colors">Lihat Semua</button>
              </div>
              <div className="space-y-4">
                {isAppLoading ? ( <><SkeletonCard /><SkeletonCard /></> ) : recentMyReports.map((report, index) => (
                  <div key={report.id} onClick={() => { setSelectedReport(report); setCurrentPage('report_detail'); }} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-sky-300 dark:hover:border-sky-500 transition-all duration-300 hover:shadow-md active:scale-[0.98] animate-fade-in-up" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2"><MapPin size={16} className="text-slate-400" /><h3 className="font-bold text-slate-800 dark:text-slate-100 transition-colors">{report.projectName}</h3></div>
                      {!report.isPending ? (
                        <span className="flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full transition-colors"><CheckCircle2 size={12} className="mr-1" /> Tersinkron</span>
                      ) : (
                        <span className="flex items-center text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-full transition-colors"><Clock size={12} className="mr-1" /> Antre di Cloud</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 ml-6 transition-colors">
                      <p>ID: {report.id} | Cuaca: {report.weatherMorning}</p>
                      {report.notes && <p className="text-[10px] mt-1 truncate text-slate-400">📝 {report.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'reports' ? <ReportsHistoryContent /> : activeTab === 'projects' ? <ProjectsContent /> : activeTab === 'profile' ? <ProfileContent /> : null}
      </div>

      <div className="absolute bottom-0 w-full bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-4 rounded-b-[2.5rem] z-50 print:hidden transition-colors duration-300">
        <div className="flex justify-between items-center">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center p-2 transition-all duration-300 group ${activeTab === 'home' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:-translate-y-1'}`}><Home size={24} className={`transition-colors ${activeTab === 'home' ? 'fill-sky-100 dark:fill-sky-900/50' : 'group-hover:fill-slate-100 dark:group-hover:fill-slate-800'}`} /><span className="text-[10px] font-semibold mt-1">Beranda</span></button>
          <button onClick={() => setActiveTab('reports')} className={`flex flex-col items-center p-2 transition-all duration-300 group ${activeTab === 'reports' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:-translate-y-1'}`}><FileText size={24} className={`transition-colors ${activeTab === 'reports' ? 'fill-sky-100 dark:fill-sky-900/50' : 'group-hover:fill-slate-100 dark:group-hover:fill-slate-800'}`} /><span className="text-[10px] font-semibold mt-1">Laporan</span></button>
          <div className="relative -top-8"><button onClick={() => setCurrentPage('new_report')} className="bg-sky-600 dark:bg-sky-500 text-white p-4 rounded-full shadow-lg hover:bg-sky-700 dark:hover:bg-sky-600 active:scale-90 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl hover:shadow-sky-600/30"><Plus size={28} /></button></div>
          <button onClick={() => setActiveTab('projects')} className={`flex flex-col items-center p-2 transition-all duration-300 group ${activeTab === 'projects' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:-translate-y-1'}`}><FolderKanban size={24} className={`transition-colors ${activeTab === 'projects' ? 'fill-sky-100 dark:fill-sky-900/50' : 'group-hover:fill-slate-100 dark:group-hover:fill-slate-800'}`} /><span className="text-[10px] font-semibold mt-1">Proyek</span></button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center p-2 transition-all duration-300 group ${activeTab === 'profile' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:-translate-y-1'}`}><User size={24} className={`transition-colors ${activeTab === 'profile' ? 'fill-sky-100 dark:fill-sky-900/50' : 'group-hover:fill-slate-100 dark:group-hover:fill-slate-800'}`} /><span className="text-[10px] font-semibold mt-1">Profil</span></button>
        </div>
      </div>
    </div>
  );
};

const NewReportView = () => {
  const { user, userProfile, setCurrentPage, draftReport, setDraftReport, projectList, capturedPhotos, setCapturedPhotos, newReportScrollPos, setNewReportScrollPos, formErrors, setFormErrors, triggerToast, reports, setReports, setProjectList, isOffline, setIsAppLoading, showCameraModal, setShowCameraModal, showVoiceNoteModal, setShowVoiceNoteModal } = useStore();
  const containerRef = useRef(null);

  useEffect(() => { if (containerRef.current && newReportScrollPos > 0) containerRef.current.scrollTop = newReportScrollPos; }, []);

  const handleScroll = (e) => setNewReportScrollPos(e.target.scrollTop);
  const updateDraft = (key, value) => { setDraftReport(prev => ({ ...prev, [key]: value })); if (formErrors[key]) setFormErrors(prev => ({ ...prev, [key]: false })); };
  const toTitleCase = (str) => str.replace(/\b\w/g, l => l.toUpperCase());

  const myProjects = useMemo(() => {
    if (userProfile?.companyName === 'Developer Internal') return projectList;
    return projectList.filter(p => !p.companyName || p.companyName === userProfile?.companyName);
  }, [projectList, userProfile]);

  const handleManpowerChange = (id, field, value) => { const val = field === 'type' ? toTitleCase(value) : value; setDraftReport(prev => ({ ...prev, manpower: prev.manpower.map(item => item.id === id ? { ...item, [field]: val } : item) })); };
  const addManpower = () => setDraftReport(prev => ({ ...prev, manpower: [...prev.manpower, { id: Date.now() + Math.random(), type: '', count: '', hours: '' }] }));
  const removeManpower = (id) => setDraftReport(prev => ({ ...prev, manpower: prev.manpower.filter(item => item.id !== id) }));

  const handleEquipmentChange = (id, field, value) => { const val = field === 'name' ? toTitleCase(value) : value; setDraftReport(prev => ({ ...prev, equipment: prev.equipment.map(item => item.id === id ? { ...item, [field]: val } : item) })); };
  const addEquipment = () => setDraftReport(prev => ({ ...prev, equipment: [...prev.equipment, { id: Date.now() + Math.random(), name: '', status: 'active', hours: '' }] }));
  const removeEquipment = (id) => setDraftReport(prev => ({ ...prev, equipment: prev.equipment.filter(item => item.id !== id) }));

  const handleSaveReport = async () => {
    let errors = { projectName: false, notes: false };
    if (!draftReport.projectName.trim()) errors.projectName = true;
    if (!draftReport.notes.trim()) errors.notes = true;
    setFormErrors(errors);

    if (errors.projectName || errors.notes) { triggerToast('⚠️ Lengkapi kolom yang bergaris merah!'); return; }
    if (!user || !db) { triggerToast('⚠️ Koneksi Database Firebase belum siap!'); return; }

    setIsAppLoading(true);
    if (!isOffline) triggerToast('Menyimpan Laporan ke Database Cloud... ☁️');

    try {
      const newReport = {
        id: `REP-${Date.now().toString().slice(-4)}`,
        userId: user.uid,
        authorName: userProfile.name,
        companyName: userProfile.companyName || 'Perusahaan Internal',
        projectName: draftReport.projectName, 
        date: new Date(draftReport.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        status: isOffline ? 'pending' : 'synced', 
        weatherMorning: draftReport.weatherMorning, 
        weatherAfternoon: draftReport.weatherAfternoon,
        notes: draftReport.notes, 
        photos: capturedPhotos, 
        manpower: [...draftReport.manpower], 
        equipment: [...draftReport.equipment],
        createdAt: Date.now()
      };
      
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), newReport);
      
      if (draftReport.projectName && !projectList.find(p => p.name === draftReport.projectName.trim())) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'projects'), { 
          id: `P-${Date.now().toString().slice(-4)}`,
          name: draftReport.projectName.trim(), 
          address: 'Lokasi Proyek Baru', 
          progress: 0, 
          status: 'active',
          companyName: userProfile.companyName || 'Perusahaan Internal',
          createdAt: Date.now()
        });
      }

      setDraftReport({ projectName: '', date: new Date().toISOString().split('T')[0], weatherMorning: 'Cerah', weatherAfternoon: 'Berawan', notes: '', manpower: [], equipment: [] });
      setCapturedPhotos([]); setNewReportScrollPos(0); setFormErrors({ projectName: false, notes: false });
      setCurrentPage('dashboard');
      triggerToast(isOffline ? 'Tersimpan aman di Antrean Offline! 🔒' : 'Laporan berhasil mendarat di Cloud! 🚀');
    } catch (error) {
      console.error("Firebase Upload Error:", error);
      triggerToast('Gagal! Coba muat ulang aplikasi. ⚠️');
    } finally {
      setIsAppLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative transition-colors duration-300 animate-slide-in-right">
      <div className="bg-sky-600 dark:bg-sky-800 text-white p-4 pt-6 rounded-b-2xl shadow-md z-10 sticky top-0 transition-colors duration-300">
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrentPage('dashboard')} className="p-2 bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition-all active:scale-95"><ArrowLeft size={20} /></button>
          <h1 className="text-lg font-bold">Laporan Harian Baru</h1>
          <div className="w-9"></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-28" ref={containerRef} onScroll={handleScroll}>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-5 transition-colors duration-300">
          <div className="flex items-center space-x-2 mb-3 text-sky-700 dark:text-sky-400"><MapPin size={20} /><h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Proyek & Waktu</h2></div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1 block">Proyek Aktif</label>
              <input list="known-projects-list" value={draftReport.projectName} onChange={(e) => updateDraft('projectName', toTitleCase(e.target.value))} placeholder="Ketik proyek baru atau pilih..." className={`w-full bg-slate-50 dark:bg-slate-900/50 text-sm rounded-lg p-2.5 focus:ring-sky-500 focus:outline-none font-medium text-slate-700 dark:text-slate-200 transition-all duration-300 ${formErrors.projectName ? 'error-border animate-shake border-2' : 'border border-slate-200 dark:border-slate-700 focus:border-sky-500'}`} />
              <datalist id="known-projects-list">{myProjects.map((proj) => <option key={proj.id} value={proj.name} />)}</datalist>
            </div>
            <div className="relative group cursor-pointer">
              <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1 flex items-center"><Calendar size={12} className="mr-1"/> Tanggal Laporan</label>
              <div className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-sm rounded-lg p-2.5 flex items-center justify-between font-medium text-slate-700 dark:text-slate-200 transition-colors group-hover:border-sky-300">
                {draftReport.date ? new Date(draftReport.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''} <Calendar size={16} className="text-slate-400" />
              </div>
              <input type="date" value={draftReport.date} onChange={(e) => updateDraft('date', e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer pt-4" />
            </div>
          </div>
        </div>

        {/* Cuaca */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-5 transition-colors duration-300">
          <div className="flex items-center space-x-2 mb-4 text-sky-700 dark:text-sky-400"><CloudSun size={20} /><h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Informasi Cuaca</h2></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1 block">Pagi</label>
              <select className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm rounded-lg p-2.5 focus:ring-sky-500" value={draftReport.weatherMorning} onChange={(e) => updateDraft('weatherMorning', e.target.value)}>
                <option value="Cerah">☀️ Cerah</option><option value="Berawan">⛅ Berawan</option><option value="Hujan Ringan">🌧️ Hujan Ringan</option><option value="Hujan Lebat">⛈️ Hujan Lebat</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1 block">Sore</label>
              <select className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm rounded-lg p-2.5 focus:ring-sky-500" value={draftReport.weatherAfternoon} onChange={(e) => updateDraft('weatherAfternoon', e.target.value)}>
                <option value="Cerah">☀️ Cerah</option><option value="Berawan">⛅ Berawan</option><option value="Hujan Ringan">🌧️ Hujan Ringan</option><option value="Hujan Lebat">⛈️ Hujan Lebat</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tenaga Kerja & Alat Berat */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-5 transition-colors duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-sky-700 dark:text-sky-400"><Users size={20} /><h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Tenaga Kerja</h2></div>
            <button onClick={addManpower} className="text-xs font-semibold text-sky-600 dark:text-sky-400 flex items-center bg-sky-50 dark:bg-sky-900/30 px-2 py-1 rounded-md hover:bg-sky-100 active:scale-95"><PlusCircle size={14} className="mr-1" /> Tambah</button>
          </div>
          <div className="space-y-3">
            {draftReport.manpower.map((worker) => (
              <div key={worker.id} className="flex space-x-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700 animate-fade-in-up">
                <div className="flex-1">
                  <input type="text" placeholder="Jenis Pekerja (Mis: Tukang Kayu)" value={worker.type} onChange={(e) => handleManpowerChange(worker.id, 'type', e.target.value)} className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 mb-2 focus:border-sky-500 focus:outline-none" />
                  <div className="flex space-x-2">
                    <input type="number" placeholder="Jumlah" value={worker.count} onChange={(e) => handleManpowerChange(worker.id, 'count', e.target.value)} className="w-1/2 text-xs p-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-sky-500 focus:outline-none" min="0" />
                    <input type="number" placeholder="Jam Kerja" value={worker.hours} onChange={(e) => handleManpowerChange(worker.id, 'hours', e.target.value)} className="w-1/2 text-xs p-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-sky-500 focus:outline-none" min="0" />
                  </div>
                </div>
                <button onClick={() => removeManpower(worker.id)} className="p-2 text-red-400 hover:text-red-600 bg-red-50 dark:bg-red-900/30 rounded-lg h-fit mt-auto active:scale-90 transition-transform"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-5 transition-colors duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-sky-700 dark:text-sky-400"><Wrench size={20} /><h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Alat Berat</h2></div>
            <button onClick={addEquipment} className="text-xs font-semibold text-sky-600 dark:text-sky-400 flex items-center bg-sky-50 dark:bg-sky-900/30 px-2 py-1 rounded-md hover:bg-sky-100 active:scale-95"><PlusCircle size={14} className="mr-1" /> Tambah</button>
          </div>
          <div className="space-y-3">
            {draftReport.equipment.map((eq) => (
              <div key={eq.id} className="flex space-x-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700 animate-fade-in-up">
                <div className="flex-1">
                  <input type="text" placeholder="Nama Alat (Mis: Excavator)" value={eq.name} onChange={(e) => handleEquipmentChange(eq.id, 'name', e.target.value)} className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 mb-2 focus:border-sky-500 focus:outline-none" />
                  <div className="flex space-x-2">
                    <select value={eq.status} onChange={(e) => handleEquipmentChange(eq.id, 'status', e.target.value)} className="w-1/2 text-xs p-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-sky-500 focus:outline-none">
                      <option value="active">Aktif</option><option value="standby">Standby</option><option value="broken">Rusak</option>
                    </select>
                    <input type="number" placeholder="Jam Pakai" value={eq.hours} onChange={(e) => handleEquipmentChange(eq.id, 'hours', e.target.value)} className="w-1/2 text-xs p-2 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-sky-500 focus:outline-none" min="0" />
                  </div>
                </div>
                <button onClick={() => removeEquipment(eq.id)} className="p-2 text-red-400 hover:text-red-600 bg-red-50 dark:bg-red-900/30 rounded-lg h-fit mt-auto active:scale-90 transition-transform"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Catatan & Foto */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-5 transition-colors duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-sky-700 dark:text-sky-400"><AlignLeft size={20} /><h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">Catatan & Dokumentasi</h2></div>
          </div>
          <div className="flex space-x-3 mb-4">
            <button onClick={() => setShowVoiceNoteModal(true)} className="flex-1 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 text-purple-600 p-3 rounded-xl flex flex-col items-center hover:bg-purple-100 active:scale-95 transition-all"><MessageSquare size={20} className="mb-1" /><span className="text-xs font-bold">Dikte Suara</span></button>
            <button onClick={() => setShowCameraModal(true)} className="flex-1 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-600 p-3 rounded-xl flex flex-col items-center hover:bg-emerald-100 active:scale-95 transition-all relative"><Camera size={20} className="mb-1" /><span className="text-xs font-bold">Foto Bukti</span>{capturedPhotos.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white animate-pulse">{capturedPhotos.length}</span>}</button>
          </div>
          <textarea className={`w-full bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 text-sm rounded-lg p-3 min-h-[120px] mb-3 focus:outline-none transition-all duration-300 resize-y ${formErrors.notes ? 'error-border animate-shake border-2' : 'border border-slate-200 dark:border-slate-700 focus:border-sky-500'}`} placeholder="Tulis catatan penting atau gunakan dikte suara di atas... (Wajib diisi)" value={draftReport.notes} onChange={(e) => updateDraft('notes', e.target.value)}></textarea>
          
          {capturedPhotos.length > 0 && (
            <div className="flex space-x-2 overflow-x-auto hide-scrollbar pb-2">
              {capturedPhotos.map((photo) => (
                <div key={photo.id} className="w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-slate-200 relative group animate-fade-in-up">
                  <img src={photo.url} alt="Captured" className="w-full h-full object-cover" />
                  <button onClick={() => setCapturedPhotos(capturedPhotos.filter(p => p.id !== photo.id))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 w-full bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 rounded-b-[2rem] z-50 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] print:hidden transition-colors duration-300">
        <button onClick={handleSaveReport} className="w-full bg-sky-600 dark:bg-sky-700 text-white font-bold text-sm py-4 rounded-xl shadow-lg hover:bg-sky-700 active:scale-95 transition-all duration-300 flex items-center justify-center hover:-translate-y-0.5"><Save size={18} className="mr-2" />Simpan Laporan Harian</button>
      </div>

      {showCameraModal && <CameraModal onClose={() => setShowCameraModal(false)} />}
      {showVoiceNoteModal && <VoiceNoteModal onClose={() => setShowVoiceNoteModal(false)} />}
    </div>
  );
};

const ReportDetailView = () => {
  const { selectedReport, setCurrentPage, triggerToast } = useStore();
  const [lightboxImage, setLightboxImage] = useState(null);

  if (!selectedReport) return null;

  const exportToExcel = () => {
    const headers = ["ID Laporan", "Perusahaan", "Proyek", "Tanggal", "Cuaca Pagi", "Cuaca Sore", "Catatan Lapangan", "Total Pekerja", "Total Alat Berat"];
    const totalWorkers = selectedReport.manpower ? selectedReport.manpower.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0) : 0;
    const totalEquipment = selectedReport.equipment ? selectedReport.equipment.length : 0;
    
    const safeNotes = selectedReport.notes ? selectedReport.notes.replace(/"/g, '""').replace(/\r?\n/g, ' ') : '-';
    const row = [selectedReport.id, `"${selectedReport.companyName || '-'}"`, `"${selectedReport.projectName}"`, selectedReport.date, selectedReport.weatherMorning, selectedReport.weatherAfternoon, `"${safeNotes}"`, totalWorkers, totalEquipment];
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + row.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedReport.id}_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Data Excel berhasil diunduh! 📊');
  };

  const exportToPDF = () => {
    triggerToast('Dokumen PDF Laporan sedang disiapkan... 📄');

    setTimeout(() => {
      const manpowerHTML = selectedReport.manpower && selectedReport.manpower.length > 0 && selectedReport.manpower[0].type !== '' ? `
        <h3 class="notes-title" style="margin-top: 25px; border-left-color: #f59e0b;">Tenaga Kerja:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <tr style="background: #f8fafc; text-align: left; border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 10px; border: 1px solid #e2e8f0;">Jenis Pekerja</th>
            <th style="padding: 10px; border: 1px solid #e2e8f0;">Jumlah</th>
            <th style="padding: 10px; border: 1px solid #e2e8f0;">Jam Kerja</th>
          </tr>
          ${selectedReport.manpower.map(m => `
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${m.type || '-'}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${m.count || '-'} Orang</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${m.hours || '-'} Jam</td>
            </tr>
          `).join('')}
        </table>
      ` : '';

      const equipmentHTML = selectedReport.equipment && selectedReport.equipment.length > 0 && selectedReport.equipment[0].name !== '' ? `
        <h3 class="notes-title" style="margin-top: 25px; border-left-color: #f59e0b;">Alat Berat:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <tr style="background: #f8fafc; text-align: left; border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 10px; border: 1px solid #e2e8f0;">Nama Alat</th>
            <th style="padding: 10px; border: 1px solid #e2e8f0;">Status</th>
            <th style="padding: 10px; border: 1px solid #e2e8f0;">Jam Pakai</th>
          </tr>
          ${selectedReport.equipment.map(e => `
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${e.name || '-'}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${e.status === 'active' ? 'Aktif' : e.status === 'standby' ? 'Standby' : 'Rusak'}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${e.hours || '-'} Jam</td>
            </tr>
          `).join('')}
        </table>
      ` : '';

      const photosHTML = selectedReport.photos && selectedReport.photos.length > 0
        ? `
          <h3 class="notes-title" style="margin-top: 30px; border-left-color: #10b981;">Dokumentasi Lapangan:</h3>
          <div class="photo-grid">
            ${selectedReport.photos.map(photo => `
              <div style="position: relative;">
                <img src="${photo.url}" class="photo-img" alt="Bukti Lapangan" />
                ${photo.lat ? `<div style="position: absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px;">GPS: ${photo.lat}, ${photo.long}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `
        : '';

      const documentContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Dokumen Laporan - ${selectedReport.id}</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #334155; line-height: 1.6; }
              .header { border-bottom: 3px solid #0284c7; padding-bottom: 15px; margin-bottom: 30px; }
              .title { font-size: 28px; font-weight: 800; color: #0284c7; margin: 0; text-transform: uppercase; letter-spacing: 1px;}
              .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
              .grid { display: grid; grid-template-columns: 160px 1fr; gap: 12px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
              .label { font-weight: 700; color: #475569; }
              .notes-title { font-size: 18px; color: #0f172a; border-left: 4px solid #0ea5e9; padding-left: 10px; margin-bottom: 15px;}
              .notes-box { background: #ffffff; border: 1px solid #cbd5e1; padding: 20px; border-radius: 8px; min-height: 100px; white-space: pre-wrap; font-size: 15px; }
              .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; page-break-inside: avoid; }
              .photo-img { width: 100%; height: 280px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
              .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; page-break-inside: avoid; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="title">Laporan Harian Konstruksi</h1>
              <p class="subtitle">Dokumen Resmi DailyReports App - ${selectedReport.companyName || 'Perusahaan Internal'}</p>
            </div>
            <div class="grid">
              <div class="label">ID Dokumen</div><div>: <b>${selectedReport.id}</b></div>
              <div class="label">Nama Perusahaan</div><div>: ${selectedReport.companyName || '-'}</div>
              <div class="label">Nama Proyek</div><div>: ${selectedReport.projectName}</div>
              <div class="label">Tanggal Laporan</div><div>: ${selectedReport.date}</div>
              <div class="label">Kondisi Cuaca</div><div>: Pagi (${selectedReport.weatherMorning}), Sore (${selectedReport.weatherAfternoon})</div>
              <div class="label">Status Data</div><div>: ${!selectedReport.isPending ? 'Tersinkronisasi (Valid)' : 'Antrean Cloud (Pending)'}</div>
            </div>
            ${manpowerHTML}
            ${equipmentHTML}
            <h3 class="notes-title">Catatan Lapangan & Temuan:</h3>
            <div class="notes-box">${selectedReport.notes ? selectedReport.notes : 'Tidak ada catatan khusus yang dilaporkan.'}</div>
            ${photosHTML}
            <div class="footer">
              <p>Dicetak / Diunduh secara otomatis oleh sistem pada ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })} WIB.</p>
              <p>© ${new Date().getFullYear()} ${selectedReport.companyName || 'PT. Konstruksi Nusantara'}</p>
            </div>
          </body>
        </html>
      `;

      const blob = new Blob([documentContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedReport.id}_Dokumen_Laporan.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      triggerToast('Dokumen Laporan berhasil diunduh! ✅');
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative transition-colors duration-300 animate-slide-in-right">
      <div className="bg-sky-600 dark:bg-sky-800 text-white p-4 pt-6 rounded-b-2xl shadow-md z-10 sticky top-0 transition-colors duration-300">
        <div className="flex items-center justify-between"><button onClick={() => setCurrentPage('dashboard')} className="p-2 bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition-all active:scale-95"><ArrowLeft size={20} /></button><h1 className="text-lg font-bold">Detail Laporan</h1><div className="w-9"></div></div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 pb-28">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-sky-500"></div>
          <div className="flex justify-between items-start mb-4">
            <div><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ID Laporan</p><h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{selectedReport.id}</h2></div>
            <div className="flex flex-col items-end space-y-1">
              {!selectedReport.isPending ? <span className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><CheckCircle2 size={12} className="mr-1" /> Tersinkron</span> : <span className="flex items-center text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full"><Clock size={12} className="mr-1" /> Antrean Cloud</span>}
              <span className="text-[9px] font-bold text-sky-600 bg-sky-50 dark:bg-sky-900/30 px-2 py-1 rounded-md">{selectedReport.companyName || 'Internal'}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-300"><MapPin size={16} className="text-slate-400 mr-2" /> <span className="font-semibold">{selectedReport.projectName}</span></div>
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-300"><Clock size={16} className="text-slate-400 mr-2" /> <span>{selectedReport.date}</span></div>
            <div className="flex items-center text-sm text-slate-600 dark:text-slate-300"><CloudSun size={16} className="text-slate-400 mr-2" /> <span>Pagi ({selectedReport.weatherMorning}), Sore ({selectedReport.weatherAfternoon})</span></div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center text-sm"><AlignLeft size={16} className="mr-2 text-sky-600" /> Catatan Lapangan</h3>
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedReport.notes || "Tidak ada catatan."}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center text-sm"><ImageIcon size={16} className="mr-2 text-sky-600" /> Dokumentasi Lapangan</h3>
          {selectedReport.photos && selectedReport.photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {selectedReport.photos.map((photo, idx) => (
                <div key={idx} onClick={() => setLightboxImage(photo.url)} className="rounded-xl overflow-hidden aspect-square border border-slate-200 dark:border-slate-700 shadow-sm relative group cursor-zoom-in hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                  <img src={photo.url} alt={`Dokumentasi ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  {photo.lat && <div className="absolute bottom-1 left-1 bg-black/60 text-[8px] px-1 rounded text-white font-mono"><MapPin size={8} className="inline mr-0.5"/>GPS</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
               <ImageIcon size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2 opacity-50" /><p className="text-xs font-semibold text-slate-500">Tidak ada foto dilampirkan.</p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">Export Dokumen</h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={exportToPDF} className="flex flex-col items-center justify-center bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 p-4 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/50 active:scale-95 transition-all shadow-sm hover:shadow-md hover:-translate-y-1">
              <FileText size={24} className="mb-2" />
              <span className="text-xs font-bold">Unduh PDF</span>
            </button>
            <button onClick={exportToExcel} className="flex flex-col items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:scale-95 transition-all shadow-sm hover:shadow-md hover:-translate-y-1">
              <Download size={24} className="mb-2" />
              <span className="text-xs font-bold">Unduh Excel</span>
            </button>
          </div>
        </div>
      </div>

      {lightboxImage && (
        <div className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out animate-fade-in" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-6 right-6 text-white bg-white/20 p-2 rounded-full hover:bg-white/30 transition-all duration-300 hover:rotate-90"><X size={24}/></button>
          <img src={lightboxImage} alt="Fullscreen Preview" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl animate-scale-in" />
        </div>
      )}
    </div>
  );
};

const compressImage = (videoOrImage, maxWidth = 800) => { 
  const canvas = document.createElement('canvas');
  let width = videoOrImage.videoWidth || videoOrImage.width;
  let height = videoOrImage.videoHeight || videoOrImage.height;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }
  canvas.width = width || 400;
  canvas.height = height || 400;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoOrImage, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const compressFile = (file, maxWidth = 800, quality = 0.5) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => { resolve(compressImage(img, maxWidth).toDataURL('image/jpeg', quality)); };
    };
  });
};

const CameraModal = ({ onClose }) => {
  const { draftReport, projectList, setProjectList, capturedPhotos, setCapturedPhotos, saveToGallery, triggerToast, appSettings } = useStore();
  const galleryInputRef = useRef(null); 
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [isFlashing, setIsFlashing] = useState(false);
  const [flashMode, setFlashMode] = useState('auto'); 
  const [hasCameraError, setHasCameraError] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(true);

  const [gpsData, setGpsData] = useState({ lat: 'Mencari...', long: 'Mencari...', location: draftReport.projectName || 'Lokasi Proyek', address: 'Menunggu sinyal GPS...' });
  const [showSettings, setShowSettings] = useState(false);
  const [geoConfig, setGeoConfig] = useState({ showLocation: true, showCoords: true, showDate: true, showTime: true, showTemp: true });

  const toggleConfig = (key) => setGeoConfig(prev => ({ ...prev, [key]: !prev[key] }));
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    let watchId;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (isMountedRef.current) {
            const acc = position.coords.accuracy ? Math.round(position.coords.accuracy) : 0;
            setGpsData(prev => ({ ...prev, lat: position.coords.latitude.toFixed(6), long: position.coords.longitude.toFixed(6), address: `Akurasi GPS: ±${acc} meter` }));
            setIsGpsLoading(false);
          }
        },
        (error) => {
          if (isMountedRef.current) {
            setGpsData(prev => ({ ...prev, lat: '-7.828611', long: '110.406111', address: 'GPS Ditolak/Gagal.' }));
            setIsGpsLoading(false);
          }
        }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    } else if (isMountedRef.current) setIsGpsLoading(false);
    
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (isMountedRef.current) {
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        } else {
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        if (isMountedRef.current) { setHasCameraError(true); triggerToast("Akses kamera ditolak."); }
      }
    };
    startCamera();

    return () => { 
      isMountedRef.current = false;
      if (watchId) navigator.geolocation.clearWatch(watchId); 
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop()); 
    };
  }, []);

  const handleToggleFlash = async () => {
    let newMode = flashMode === 'auto' ? 'on' : flashMode === 'on' ? 'off' : 'auto';
    setFlashMode(newMode);
    triggerToast(`⚡ Flash Kamera: ${newMode.toUpperCase()}`);
  };

  const handleShutterClick = () => {
    if (capturedPhotos.length >= 5) { triggerToast('⚠️ Batas maksimal 5 foto tercapai!'); return; }
    setIsFlashing(true);
    
    let imageUrl = `https://picsum.photos/seed/${Date.now()}/400/400`; 
    if (videoRef.current && !hasCameraError) {
      const compressedCanvas = compressImage(videoRef.current, 800);
      let quality = appSettings.photoQuality === 'high' ? 0.6 : appSettings.photoQuality === 'medium' ? 0.4 : 0.2;
      imageUrl = compressedCanvas.toDataURL('image/jpeg', quality);
    }

    setTimeout(() => {
      if (!isMountedRef.current) return; 
      setIsFlashing(false);
      setCapturedPhotos(prev => [...prev, { id: Date.now(), url: imageUrl, lat: gpsData.lat, long: gpsData.long, location: gpsData.location }]);
      triggerToast(saveToGallery ? '📸 Foto auto-compress disalin ke Galeri!' : '📸 Foto lapangan berhasil ditangkap!');
    }, 150); 
  };

  return (
    <div className="absolute inset-0 z-[200] flex flex-col h-full bg-black text-white animate-fade-in-up">
      {isFlashing && <div className="absolute inset-0 bg-white z-[250] opacity-90 transition-opacity duration-75"></div>}
      
      <div className="absolute top-0 w-full p-6 flex justify-between items-center z-[210] bg-gradient-to-b from-black/70 to-transparent">
        <button onClick={onClose} className="p-2 bg-white/20 rounded-full backdrop-blur-md hover:bg-white/30 transition active:scale-95 flex items-center"><ArrowLeft size={16} className="mr-1" /> <span className="text-xs font-bold mr-1">Kembali</span></button>
        <div className="flex space-x-3">
          <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-full backdrop-blur-md hover:bg-white/30 transition ${showSettings ? 'bg-sky-500 text-white' : 'bg-white/20'}`}><Settings size={20} /></button>
          <button onClick={handleToggleFlash} className="w-10 h-10 bg-white/20 rounded-full backdrop-blur-md hover:bg-white/30 transition flex items-center justify-center"><Zap size={20} className={flashMode === 'on' ? 'text-white' : 'text-yellow-400'} /></button>
        </div>
      </div>

      {showSettings && (
        <div className="absolute top-20 right-6 bg-slate-800/80 backdrop-blur-xl p-4 rounded-2xl border border-slate-600/50 z-50 w-72 shadow-2xl animate-fade-in max-h-[75vh] overflow-y-auto hide-scrollbar text-white">
          <h3 className="text-sm font-bold mb-3 flex items-center"><Settings size={16} className="mr-2 text-sky-400"/> Geotagging</h3>
          <div className="bg-slate-900/50 p-2 rounded-xl mb-4 border border-slate-700/50">
            {Object.entries({ showLocation: 'Lokasi & Alamat', showCoords: 'Koordinat', showDate: 'Tanggal', showTime: 'Waktu', showTemp: 'Suhu' }).map(([key, label], idx, arr) => (
              <div key={key} className={`flex justify-between items-center py-2 ${idx !== arr.length - 1 ? 'border-b border-slate-700/50' : ''}`}>
                <span className="text-xs text-sky-100 font-medium">{label}</span>
                <button onClick={() => toggleConfig(key)} className={`w-10 h-5 rounded-full relative transition-colors ${geoConfig[key] ? 'bg-sky-500' : 'bg-slate-600'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${geoConfig[key] ? 'translate-x-5' : 'translate-x-1'}`}></div></button>
              </div>
            ))}
          </div>
          <h3 className="text-sm font-bold mb-3 flex items-center pt-2 border-t border-slate-600/50"><Edit2 size={16} className="mr-2 text-emerald-400"/> Edit Manual</h3>
          <div className="space-y-3">
            <div><label className="text-[10px] text-slate-400 font-bold uppercase">Nama Proyek</label><input list="camera-projects" type="text" value={gpsData.location} onChange={(e) => setGpsData({...gpsData, location: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:border-sky-500 mt-1"/><datalist id="camera-projects">{projectList.map((p) => <option key={p.id} value={p.name} />)}</datalist></div>
            <div><label className="text-[10px] text-slate-400 font-bold uppercase">Alamat</label><input type="text" value={gpsData.address} onChange={(e) => setGpsData({...gpsData, address: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:border-sky-500 mt-1"/></div>
            <div className="flex space-x-2">
              <div className="w-1/2"><label className="text-[10px] text-slate-400 font-bold uppercase">Lat</label><input type="text" value={gpsData.lat} onChange={(e) => setGpsData({...gpsData, lat: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white font-mono mt-1"/></div>
              <div className="w-1/2"><label className="text-[10px] text-slate-400 font-bold uppercase">Long</label><input type="text" value={gpsData.long} onChange={(e) => setGpsData({...gpsData, long: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs text-white font-mono mt-1"/></div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-900">
        <div className="absolute inset-0 flex items-center justify-center">
          {hasCameraError ? (
            <div className="flex flex-col items-center text-slate-500"><Camera size={64} className="mb-4 opacity-50" /><p className="text-xs font-semibold px-8 text-center text-slate-400">Kamera tidak dapat diakses.</p></div>
          ) : <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />}
        </div>
      </div>

      <div className="absolute top-24 left-6 z-30 transition-all duration-500 w-[280px] pointer-events-none">
        <div className="relative inline-block w-full">
          {geoConfig.showLocation && (
            <div className="flex items-start space-x-2 mb-2 pr-2">
              <MapPin size={18} className={`shrink-0 drop-shadow-md mt-0.5 ${isGpsLoading ? 'text-amber-400 animate-pulse' : 'text-red-500'}`} />
              <div className="flex flex-col"><p className="text-sm font-bold truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] text-white">{gpsData.location}</p><p className="text-[10px] font-medium leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] text-white/90">{gpsData.address}</p></div>
            </div>
          )}
          <div className={`${geoConfig.showLocation ? 'ml-7' : 'ml-1'} space-y-1`}>
            {geoConfig.showCoords && <p className="text-[10px] text-white font-mono drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">Lat: {gpsData.lat}, Long: {gpsData.long}</p>}
            {(geoConfig.showDate || geoConfig.showTime || geoConfig.showTemp) && (
              <p className="text-[10px] text-white font-mono drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                {[geoConfig.showDate ? new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '', geoConfig.showTime ? new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '', geoConfig.showTemp ? '24°C' : ''].filter(Boolean).join(' • ')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 w-full bg-black pb-8 pt-4 px-8 z-40 rounded-b-[2rem]">
        <div className="flex justify-between items-center">
          <input type="file" accept="image/*" multiple className="hidden" ref={galleryInputRef} onChange={async (e) => {
            if (e.target.files) {
              const files = Array.from(e.target.files);
              if (capturedPhotos.length + files.length > 5) { triggerToast('⚠️ Gagal: Maksimal 5 foto per laporan!'); return; }
              triggerToast('Sedang memproses & kompresi foto... ⏳');
              let quality = appSettings.photoQuality === 'high' ? 0.6 : appSettings.photoQuality === 'medium' ? 0.4 : 0.2;
              const compressedUploads = await Promise.all(files.map(async (f, idx) => {
                const compressedUrl = await compressFile(f, 800, quality);
                return { id: Date.now() + idx, url: compressedUrl, lat: gpsData.lat, long: gpsData.long, location: gpsData.location };
              }));
              if (isMountedRef.current) {
                setCapturedPhotos(prev => [...prev, ...compressedUploads]);
                triggerToast(`Berhasil menyematkan ${files.length} foto dari Galeri! 🖼️`);
              }
            }
          }} />
          <button onClick={onClose} className="w-12 h-12 bg-white/10 rounded-full hover:bg-white/20 transition border-2 border-slate-500 flex items-center justify-center overflow-hidden relative">
            {capturedPhotos.length > 0 ? (
              <><img src={capturedPhotos[capturedPhotos.length - 1].url} className="w-full h-full object-cover" alt="Last" /><div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{capturedPhotos.length}</div></>
            ) : <ImageIcon size={20} className="text-white" />}
          </button>
          <button onClick={handleShutterClick} className="w-20 h-20 bg-white rounded-full flex items-center justify-center p-1 cursor-pointer hover:scale-105 active:scale-95 transition-transform border-4 border-gray-300 relative group"><div className="w-full h-full bg-white rounded-full border-2 border-black"></div></button>
          <button onClick={() => galleryInputRef.current?.click()} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition"><UploadCloud size={24} /></button>
        </div>
      </div>
    </div>
  );
};

const VoiceNoteModal = ({ onClose }) => {
  const { draftReport, setDraftReport, triggerToast } = useStore();
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false); 
  const [isFinished, setIsFinished] = useState(false);   
  const recognitionRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'id-ID'; 

      recognition.onresult = (event) => {
        if (!isMountedRef.current) return;
        const currentTranscript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        if (isMountedRef.current) {
          triggerToast('Gagal mendengar suara. Pastikan izin Mikrofon aktif! 🎤');
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (isMountedRef.current) {
          setIsListening(false);
          setIsFinished(true);
        }
      };

      recognitionRef.current = recognition;
    } else {
      triggerToast('Maaf, browser Anda tidak mendukung fitur Dikte Suara. 😔');
    }

    return () => { 
      isMountedRef.current = false; 
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [triggerToast]);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        triggerToast('Dikte suara tidak didukung browser ini.');
        return;
      }
      setTranscript('');
      setIsFinished(false);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch(e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="absolute inset-0 z-[200] flex flex-col h-full bg-slate-900 text-white items-center animate-fade-in-up">
      <div className="absolute top-0 w-full p-6 flex justify-between items-center z-[210]">
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition active:scale-95 flex items-center"><ArrowLeft size={16} className="mr-1" /> <span className="text-xs font-bold mr-1">Batal</span></button>
        <span className="text-sm font-bold text-purple-300">Dikte Lapangan</span>
        <div className="w-16"></div>
      </div>

      <div className="flex flex-col items-center mt-24 mb-8">
        <button onClick={toggleListen} className={`w-28 h-28 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${isListening ? 'bg-red-500/20 border-red-500/50 animate-pulse scale-110 shadow-[0_0_30px_rgba(239,68,68,0.4)]' : isFinished ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 active:scale-95' : 'bg-slate-800 border-slate-700 hover:border-purple-500 hover:bg-slate-800/80'}`}>
          {isListening ? <Square size={32} fill="currentColor" className="text-red-500" /> : isFinished ? <CheckCircle2 size={40} className="text-emerald-400" /> : <Mic size={40} className="text-slate-500" />}
        </button>
        <p className={`text-xs font-semibold uppercase tracking-wider mt-6 ${isListening ? 'text-red-400 animate-pulse' : isFinished ? 'text-emerald-300' : 'text-slate-400'}`}>
          {isListening ? 'Sedang Merekam (Ketuk untuk Stop)' : isFinished ? 'Selesai (Ketuk Ulang Merekam)' : 'Ketuk Mikrofon Untuk Mulai'}
        </p>
      </div>

      <div className="w-full px-6 flex-1">
        <div className={`backdrop-blur-sm border rounded-2xl p-5 h-64 overflow-y-auto transition-colors ${isListening ? 'bg-red-900/10 border-red-500/30' : 'bg-slate-800/80 border-slate-700'}`}>
          <p className="text-sm text-slate-300 leading-relaxed italic">{transcript || "Siap mendengarkan laporanmu. Suara Anda akan diketik otomatis di sini..."}</p>
        </div>
      </div>

      <div className="absolute bottom-12 w-full px-8">
        <button onClick={() => { setDraftReport(prev => ({ ...prev, notes: prev.notes ? prev.notes + "\n" + transcript : transcript })); onClose(); }} disabled={!transcript || isListening} className={`w-full font-bold text-sm py-4 rounded-xl shadow-lg transition-all flex items-center justify-center ${transcript && !isListening ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-[0_0_20px_rgba(147,51,234,0.4)]' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}><CheckCircle2 size={18} className="mr-2" /> Gunakan Teks</button>
      </div>
    </div>
  );
};

const LoginView = () => {
  const { userProfile, setUserProfile, setIsAuthenticated, triggerToast, isAppLoading } = useStore();
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  if (isAppLoading) return <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 justify-center px-8 animate-pulse p-10"><div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl mx-auto mb-8"></div></div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative justify-center px-8 animate-fade-in overflow-hidden transition-colors duration-300">
      <div className="absolute top-0 left-0 w-full h-72 bg-sky-600 dark:bg-sky-800 rounded-b-[4rem] z-0 transition-colors duration-300"></div>
      <div className="relative z-10 flex flex-col items-center mb-8 mt-12 animate-slide-down">
        <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center mb-4 border-b-4 border-sky-200"><Wrench size={40} className="text-sky-600 dark:text-sky-400" /></div>
        <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-md">DailyReports</h1>
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 relative z-10 animate-fade-in-up">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">Masuk ke Akunmu</h2>
        <form onSubmit={async (e) => { 
          e.preventDefault(); 
          setIsSubmitting(true); 
          
          if (!isMountedRef.current) return;

          try {
            if (!auth || !db) {
              triggerToast('❌ Sistem Cloud Firebase gagal dimuat. Mohon muat ulang aplikasi.');
              setIsSubmitting(false);
              return;
            }

            let role = null;
            let companyName = "Proyek Klien";

            // 🛡️ TAHAP 1: Cek Database Cloud (Firestore)
            // FIXED: Dhelila menghapus klausa where() agar kompatibel dengan Firebase canvas dan memfilternya secara in-memory!
            try {
              const codesRef = collection(db, 'artifacts', appId, 'public', 'data', 'access_codes');
              const querySnapshot = await getDocs(codesRef);
              
              const allCodes = querySnapshot.docs.map(doc => doc.data());
              const matchedCode = allCodes.find(c => c.code === accessCode);

              if (matchedCode) {
                role = matchedCode.role; 
                companyName = matchedCode.companyName || companyName;
              }
            } catch (dbError) {
              console.warn("Gagal cek database cloud, menggunakan fallback lokal.", dbError);
            }

            // 🛡️ TAHAP 2: Cek Fallback Lokal (Jika DB kosong/gagal)
            if (!role) {
              const validCodes = {
                'DEV-ADMIN-99': { role: 'admin', companyName: 'Developer Internal' },
                'DEV-USER-01': { role: 'user', companyName: 'Perusahaan Prototype' }
              };
              const validData = validCodes[accessCode];
              if (validData) {
                role = validData.role;
                companyName = validData.companyName;
              }
            }

            // 🛡️ TAHAP 3: Validasi Akhir
            if (!role) {
              triggerToast('❌ Kode Akses salah atau tidak terdaftar!');
              setIsSubmitting(false);
              return;
            }

            const username = email.split('@')[0];
            const newProfile = { 
              name: username.toUpperCase(),
              roleCode: role,
              roleLabel: role === 'admin' ? 'Administrator Pusat' : 'User',
              companyName: companyName
            };
            
            // 🛡️ MENYIMPAN PROFIL KE FIREBASE AUTH
            if (auth.currentUser) {
              await updateProfile(auth.currentUser, { displayName: JSON.stringify(newProfile) }).catch(e => console.error(e));
            }
            
            setUserProfile(newProfile);
            setIsAuthenticated(true); 
            setIsSubmitting(false);
            triggerToast(`Akses Diberikan! Selamat bekerja di ${companyName}! ☁️`); 

          } catch (error) {
            console.error(error);
            triggerToast('⚠️ Terjadi kesalahan sistem saat memverifikasi kode.');
            setIsSubmitting(false);
          }
        }} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Email / ID Pegawai</label>
            <div className="relative"><Mail size={18} className="absolute left-3 top-3.5 text-slate-400" /><input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="budi.user@proyek.com" className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white pl-10 pr-4 py-3 rounded-xl text-sm" required /></div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center justify-between">
              <span>Kode Akses Developer</span>
              <Lock size={12} className="text-sky-500"/>
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-3.5 text-slate-400" />
              <input 
                type={showAccessCode ? "text" : "password"} 
                value={accessCode} 
                onChange={(e) => setAccessCode(e.target.value)} 
                placeholder="Masukkan kode lisensi..." 
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 dark:text-white pl-10 pr-12 py-3 rounded-xl text-sm" 
                required 
              />
              <button 
                type="button" 
                onClick={() => setShowAccessCode(!showAccessCode)} 
                className="absolute right-3 top-3 text-slate-400 hover:text-sky-500 transition-colors focus:outline-none"
              >
                {showAccessCode ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className={`w-full py-4 rounded-xl font-bold text-sm text-white transition-all shadow-lg ${isSubmitting ? 'bg-sky-400 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 active:scale-95'}`}>{isSubmitting ? <RefreshCw size={20} className="animate-spin mx-auto" /> : 'Verifikasi & Masuk'}</button>
        </form>
      </div>

      <div className="mt-auto pb-6 pt-10 text-center relative z-10 flex-1 flex flex-col justify-end animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
        <div className="mt-8 opacity-80 hover:opacity-100 transition-opacity duration-300">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Developed & Crafted By</p>
          <p className="text-sm font-black text-sky-600 dark:text-sky-400 tracking-widest drop-shadow-sm">ADIPRAMONOSN</p>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 📈 ADMIN DASHBOARD VIEW
// ==========================================
const AdminDashboardView = () => {
  const { reports, projectList, setIsAuthenticated, triggerToast, setCurrentPage, accessCodesList, userProfile } = useStore();
  
  const [adminTab, setAdminTab] = useState('overview'); 
  const [selectedAdminReport, setSelectedAdminReport] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('Semua Proyek');
  const [lightboxImage, setLightboxImage] = useState(null);

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
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'access_codes'), {
        companyName: newLicenseForm.companyName,
        role: newLicenseForm.role,
        code: newLicenseForm.code,
        createdAt: Date.now()
      });
      triggerToast('✅ Lisensi baru berhasil diterbitkan!');
      setNewLicenseForm({ companyName: '', role: 'user', code: '' });
    } catch (error) {
      triggerToast('❌ Gagal menyimpan lisensi ke database.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteLicense = async (docId) => {
    if(window.confirm('Yakin ingin mencabut lisensi ini? Pegawai mereka tidak akan bisa login lagi.')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'access_codes', docId));
        triggerToast('🗑️ Lisensi berhasil dicabut.');
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
  
  const exportAllToExcel = () => {
    const headers = ["ID Laporan", "Perusahaan", "Pelapor", "Proyek", "Tanggal", "Catatan", "Pekerja", "Alat Berat"];
    const rows = adminCompanyReports.map(r => {
      const workers = r.manpower ? r.manpower.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0) : 0;
      const eq = r.equipment ? r.equipment.length : 0;
      const safeNotes = r.notes ? r.notes.replace(/"/g, '""').replace(/\r?\n/g, ' ') : '-';
      return `${r.id},"${r.companyName || '-'}","${r.authorName || 'User'}","${r.projectName}",${r.date},"${safeNotes}",${workers},${eq}`;
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Semua_Laporan_Terkumpul.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Seluruh data pusat berhasil diekspor! 📊');
  };

  const filteredReports = useMemo(() => {
    return adminCompanyReports.filter(r => {
      const matchSearch = r.id.toLowerCase().includes(searchQuery.toLowerCase()) || (r.authorName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchProject = filterProject === 'Semua Proyek' ? true : r.projectName === filterProject;
      return matchSearch && matchProject;
    });
  }, [adminCompanyReports, searchQuery, filterProject]);

  if (selectedAdminReport) {
    const r = selectedAdminReport;
    return (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative transition-colors duration-300 animate-slide-in-right">
        <div className="bg-indigo-600 dark:bg-indigo-800 text-white p-4 pt-6 rounded-b-2xl shadow-md z-10 sticky top-0">
          <div className="flex items-center justify-between">
            <button onClick={() => setSelectedAdminReport(null)} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all active:scale-95"><ArrowLeft size={20} /></button>
            <h1 className="text-lg font-bold">Detail Laporan</h1>
            <div className="w-9"></div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 pb-10 space-y-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ID Laporan</p>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{r.id}</h2>
              </div>
              <div className="flex flex-col items-end space-y-1">
                <span className="flex items-center text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-full"><User size={12} className="mr-1" /> {r.authorName || 'User'}</span>
                <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">{r.companyName || 'Internal'}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-300"><MapPin size={16} className="text-slate-400 mr-2" /> <span className="font-semibold">{r.projectName}</span></div>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-300"><Clock size={16} className="text-slate-400 mr-2" /> <span>{r.date}</span></div>
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-300"><CloudSun size={16} className="text-slate-400 mr-2" /> <span>Pagi ({r.weatherMorning}), Sore ({r.weatherAfternoon})</span></div>
            </div>
          </div>

          {(r.manpower?.length > 0 || r.equipment?.length > 0) && (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              {r.manpower?.length > 0 && r.manpower[0].type && (
                <>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center text-sm"><Users size={16} className="mr-2 text-indigo-600" /> Tenaga Kerja</h3>
                  <div className="space-y-2 mb-4">
                    {r.manpower.map((worker, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{worker.type}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs">{worker.count} Org • {worker.hours} Jam</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {r.equipment?.length > 0 && r.equipment[0].name && (
                <>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center text-sm"><Wrench size={16} className="mr-2 text-indigo-600" /> Alat Berat</h3>
                  <div className="space-y-2">
                    {r.equipment.map((eq, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{eq.name}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs">{eq.status} • {eq.hours} Jam</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center text-sm"><AlignLeft size={16} className="mr-2 text-indigo-600" /> Catatan Lapangan</h3>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{r.notes || "Tidak ada catatan."}</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center text-sm"><ImageIcon size={16} className="mr-2 text-indigo-600" /> Dokumentasi Lapangan</h3>
            {r.photos && r.photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {r.photos.map((photo, idx) => (
                  <div key={idx} className="rounded-xl overflow-hidden aspect-square border border-slate-200 dark:border-slate-700 shadow-sm relative group transition-all">
                    <img onClick={() => setLightboxImage(photo.url || photo)} src={photo.url || photo} alt={`Dokumentasi ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 cursor-zoom-in" />
                    
                    {photo.lat && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${photo.lat},${photo.long}`} target="_blank" rel="noreferrer" className="absolute bottom-2 left-2 bg-black/80 hover:bg-indigo-600 text-[9px] px-2 py-1.5 rounded-md text-white font-bold tracking-wide flex items-center transition-colors shadow-lg z-10">
                        <MapPin size={12} className="mr-1 text-emerald-400"/> Buka Peta <ExternalLink size={10} className="ml-1 opacity-70"/>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                <ImageIcon size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2 opacity-50" /><p className="text-xs font-semibold text-slate-500">Tidak ada foto dilampirkan.</p>
              </div>
            )}
          </div>
        </div>

        {lightboxImage && (
          <div className="fixed inset-0 z-[1000] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out animate-fade-in" onClick={() => setLightboxImage(null)}>
            <button className="absolute top-6 right-6 text-white bg-white/20 p-2 rounded-full hover:bg-white/30 transition-all duration-300 hover:rotate-90"><X size={24}/></button>
            <img src={lightboxImage} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl animate-scale-in" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative transition-colors duration-300">
      <div className="bg-indigo-600 dark:bg-indigo-800 text-white p-6 rounded-b-3xl shadow-lg transition-colors duration-300">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center"><ShieldCheck size={24} className="mr-2" /><h1 className="text-xl font-bold">Admin Panel</h1></div>
          <button onClick={async () => { 
            if (auth && auth.currentUser) await updateProfile(auth.currentUser, { displayName: "" }).catch(()=>{});
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

            {adminCompanyReports.length > 0 && adminCompanyProjects.length > 0 && (
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center"><BarChart3 size={18} className="mr-2 text-indigo-500"/> Distribusi Laporan per Proyek</h2>
                <div className="flex items-end h-32 space-x-3 border-b border-slate-200 dark:border-slate-700 pb-2">
                  {adminCompanyProjects.slice(0, 5).map(proj => {
                    const count = adminCompanyReports.filter(r => r.projectName === proj.name).length;
                    const maxCount = Math.max(...adminCompanyProjects.map(p => adminCompanyReports.filter(r => r.projectName === p.name).length), 1);
                    const heightPct = count > 0 ? Math.max(10, Math.round((count / maxCount) * 100)) : 0; 
                    
                    return (
                      <div key={proj.id} className="flex-1 flex flex-col items-center justify-end h-full group">
                        <span className={`text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1 transition-opacity ${count > 0 ? 'opacity-100' : 'opacity-0'}`}>{count}</span>
                        <div className={`w-full rounded-t-md transition-colors relative ${count > 0 ? 'bg-indigo-500 group-hover:bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'bg-slate-200 dark:bg-slate-700'}`} style={{ height: `${heightPct}%` }}></div>
                        <span className="text-[8px] text-slate-500 truncate w-full text-center mt-2 font-semibold" title={proj.name}>{proj.name.substring(0, 8)}..</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button onClick={exportAllToExcel} className="w-full mb-6 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-4 rounded-xl font-bold flex flex-col items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-200 dark:border-indigo-800 active:scale-95 shadow-sm">
              <Download size={24} className="mb-2" /> <span className="text-xs text-center leading-tight mt-1">Unduh Semua Data Excel/CSV</span>
            </button>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center"><List size={18} className="mr-2 text-slate-400"/> Pencarian Laporan</h2>
              </div>
              
              <div className="space-y-3 mb-6 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input type="text" placeholder="Cari ID / Nama User..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 p-2 pl-9 rounded-lg text-xs focus:border-indigo-500 focus:outline-none transition-colors" />
                </div>
                <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 p-2 rounded-lg text-xs focus:border-indigo-500 focus:outline-none transition-colors">
                  <option value="Semua Proyek">Semua Proyek</option>
                  {adminCompanyProjects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                {filteredReports.length === 0 ? (
                  <p className="text-xs text-center text-slate-400 py-4">Laporan tidak ditemukan.</p>
                ) : filteredReports.map(r => (
                  <div key={r.dbId} onClick={() => setSelectedAdminReport(r)} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all cursor-pointer active:scale-[0.98] group">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{r.projectName}</h3>
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-full font-bold">{r.id}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center"><User size={12} className="mr-1"/> <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1">{r.authorName || 'User'}</span> • {r.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center border-b border-slate-100 dark:border-slate-700 pb-3"><Key size={18} className="mr-2 text-amber-500"/> Terbitkan Kode Lisensi Baru</h2>
              <form onSubmit={handleCreateLicense} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Nama Perusahaan Klien</label>
                  <input type="text" placeholder="Misal: PT. Konstruksi Bangsa" value={newLicenseForm.companyName} onChange={(e) => setNewLicenseForm({...newLicenseForm, companyName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-sm dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Tipe Akses (Role)</label>
                    <select value={newLicenseForm.role} onChange={(e) => setNewLicenseForm({...newLicenseForm, role: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-sm dark:text-white focus:border-indigo-500 outline-none transition-all">
                      <option value="user">User / Mandor</option>
                      <option value="admin">Admin Pusat</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block flex justify-between">
                      <span>Kode Rahasia</span>
                      <button type="button" onClick={generateRandomCode} className="text-indigo-600 dark:text-indigo-400 hover:underline">Generate</button>
                    </label>
                    <input type="text" placeholder="Generate kode..." value={newLicenseForm.code} onChange={(e) => setNewLicenseForm({...newLicenseForm, code: e.target.value.toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl text-sm dark:text-white focus:border-indigo-500 outline-none transition-all uppercase font-mono" />
                  </div>
                </div>
                <button type="submit" disabled={isGenerating} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center">
                  {isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <><Plus size={18} className="mr-2"/> Terbitkan Lisensi</>}
                </button>
              </form>
            </div>

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
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase mr-2 ${license.role === 'admin' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' : 'bg-sky-100 text-sky-600 dark:bg-sky-900/30'}`}>
                            {license.role}
                          </span>
                          <span className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition" onClick={() => copyToClipboard(license.code)} title="Klik untuk copy">
                            {license.code} <Copy size={10} className="inline ml-1 opacity-50"/>
                          </span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteLicense(license.dbId)} className="p-2 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-colors flex-shrink-0 active:scale-90">
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
          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">System Architect</p>
          <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 tracking-widest">ADIPRAMONOSN</p>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 🌟 ISTANA UTAMA (CONTROLLER)
// ==========================================
const AppContent = () => {
  const { isAuthenticated, currentPage, showToast, toastMessage, isOffline, appSettings, userProfile } = useStore();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      if (appSettings.theme === 'dark') return true;
      if (appSettings.theme === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    };
    setIsDarkMode(checkTheme());
    
    if (appSettings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => setIsDarkMode(e.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [appSettings.theme]);

  return (
    <>
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25%, 75% { transform: translateX(-4px); } 50% { transform: translateX(4px); } }
        @keyframes fadeInUpSmooth { 0% { opacity: 0; transform: translateY(15px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes slideInRightSmooth { 0% { opacity: 0; transform: translateX(20px); } 100% { opacity: 1; transform: translateX(0); } }
        @keyframes slideDownSmooth { 0% { opacity: 0; transform: translateY(-20px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        .animate-fade-in-up { animation: fadeInUpSmooth 0.5s forwards; }
        .animate-slide-in-right { animation: slideInRightSmooth 0.4s forwards; }
        .animate-slide-down { animation: slideDownSmooth 0.4s forwards; }
        .animate-scale-in { animation: scaleIn 0.3s forwards; }
        .animate-fade-in { animation: fadeIn 0.3s forwards; }
        .error-border { border-color: #ef4444 !important; background-color: #fef2f2 !important; }
      `}</style>

      <div className={`max-w-md mx-auto h-[850px] relative overflow-hidden font-sans shadow-2xl sm:rounded-[2.5rem] sm:border-8 border-slate-800 my-4 flex flex-col print:shadow-none print:border-none print:h-auto print:w-full transition-colors duration-500 ${isDarkMode ? 'dark bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
        <ErrorBoundary>
          {isOffline && isAuthenticated && (
            <div className="bg-red-500 text-white text-xs font-bold py-1.5 px-4 flex items-center justify-center animate-slide-down z-[100] relative shadow-md">
              <WifiOff size={14} className="mr-2 animate-pulse" /> Koneksi terputus. Mode Brankas Offline aktif.
            </div>
          )}

          {!isAuthenticated ? <LoginView /> : (
            <div className="flex flex-col flex-1 h-full overflow-hidden relative bg-slate-50 dark:bg-slate-900">
              {userProfile?.roleCode === 'admin' ? (
                <AdminDashboardView />
              ) : (
                <>
                  {currentPage === 'dashboard' && <DashboardView />}
                  {currentPage === 'new_report' && <NewReportView />}
                  {currentPage === 'report_detail' && <ReportDetailView />}
                  {currentPage === 'settings' && <SettingsView />}
                </>
              )}
            </div>
          )}

          {showToast && (
            <div className="absolute top-10 left-10 right-10 flex justify-center z-[110] print:hidden pointer-events-none">
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