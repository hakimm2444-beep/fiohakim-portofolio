// =========================================
// 1. IMPORT & INISIALISASI FIREBASE SDK
// =========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytesResumable, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Konfigurasi Firebase Proyek fiohakim-portofolio
const firebaseConfig = {
    apiKey: "AIzaSyAfUEk1G_noUjtd1MinSxNKdg5T57GcoXE",
    authDomain: "fiohakim-portofolio.firebaseapp.com",
    projectId: "fiohakim-portofolio",
    storageBucket: "fiohakim-portofolio.firebasestorage.app",
    messagingSenderId: "320478750884",
    appId: "1:320478750884:web:a401db78cb2b52bb2f1e31",
    measurementId: "G-7FXS8PH2F4"
};

// Inisialisasi Firebase & Layanan
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Referensi Dokumen Utama Portofolio di Firestore
const portfolioDocRef = doc(db, "portfolio", "mainData");

// =========================================
// 2. MUAT DATA DARI FIRESTORE SAAT WEB DIBUKA
// =========================================
async function loadCloudContent() {
    try {
        const docSnap = await getDoc(portfolioDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();

            // Terapkan teks yang tersimpan di Firestore
            if (data.texts) {
                document.querySelectorAll('.editable').forEach(el => {
                    const key = el.getAttribute('data-key');
                    if (data.texts[key]) {
                        el.innerHTML = data.texts[key];
                    }
                });
            }

            // Terapkan URL gambar resolusi tinggi dari Firebase Storage
            if (data.media) {
                if (data.media.profileImage) {
                    document.getElementById('profileImage').src = data.media.profileImage;
                }
                if (data.media.bannerImage) {
                    document.getElementById('home').style.backgroundImage = `url('${data.media.bannerImage}')`;
                }
                if (data.media.bgImage) {
                    document.body.style.backgroundImage = `url('${data.media.bgImage}')`;
                }
            }
        }
    } catch (error) {
        console.error("Gagal memuat data dari Firebase:", error);
    }
}

// =========================================
// 3. AUTENTIKASI ADMIN & SAKELAR EDIT BEBAS
// =========================================
const adminLoginBtn = document.getElementById('adminLoginBtn');
const loginModal = document.getElementById('loginModal');
const closeModal = document.querySelector('.close-modal');
const submitLoginBtn = document.getElementById('submitLoginBtn');
const adminEmailInput = document.getElementById('adminEmailInput');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const adminPanel = document.getElementById('adminPanel');
const logoutAdminBtn = document.getElementById('logoutAdminBtn');
const editModeToggle = document.getElementById('editModeToggle');
const editStatusText = document.getElementById('editStatusText');
const uploadProgressText = document.getElementById('uploadProgressText');

let currentUser = null;

// Pantau status login admin
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        adminPanel.classList.remove('hidden');
        setEditMode(false); // Default aman: Mode Lihat aktif saat masuk
    } else {
        adminPanel.classList.add('hidden');
        setEditMode(false);
    }
});

adminLoginBtn.addEventListener('click', () => {
    if (currentUser) {
        adminPanel.classList.toggle('hidden');
    } else {
        loginModal.style.display = 'flex';
        adminEmailInput.focus();
    }
});

closeModal.addEventListener('click', () => {
    loginModal.style.display = 'none';
});

// Login dengan Firebase Authentication
async function handleFirebaseLogin() {
    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value;

    if (!email || !password) {
        alert("Harap isi email dan password admin!");
        return;
    }

    try {
        submitLoginBtn.textContent = "Memverifikasi...";
        await signInWithEmailAndPassword(auth, email, password);
        loginModal.style.display = 'none';
        adminEmailInput.value = '';
        adminPasswordInput.value = '';
    } catch (error) {
        alert("Login gagal: " + error.message);
    } finally {
        submitLoginBtn.textContent = "Masuk";
    }
}

submitLoginBtn.addEventListener('click', handleFirebaseLogin);
adminPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleFirebaseLogin();
});

// Logout Firebase
logoutAdminBtn.addEventListener('click', async () => {
    await signOut(auth);
});

// Sakelar Bebas Pilih Mode Edit / Lihat
function setEditMode(enabled) {
    editModeToggle.checked = enabled;
    const editables = document.querySelectorAll('.editable');
    
    if (enabled) {
        document.body.classList.add('editing-active');
        editables.forEach(el => el.setAttribute('contenteditable', 'true'));
        editStatusText.textContent = 'Status: Mode Edit Aktif (Klik teks untuk mengubah)';
        editStatusText.style.color = '#00ff88';
    } else {
        document.body.classList.remove('editing-active');
        editables.forEach(el => el.removeAttribute('contenteditable'));
        editStatusText.textContent = 'Status: Mode Lihat (Teks terkunci aman)';
        editStatusText.style.color = '#00f2fe';
    }
}

editModeToggle.addEventListener('change', (e) => {
    setEditMode(e.target.checked);
});

// Simpan Perubahan Teks ke Cloud Firestore
document.getElementById('saveChangesBtn').addEventListener('click', async () => {
    if (!currentUser) return;

    const btn = document.getElementById('saveChangesBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

    const textData = {};
    document.querySelectorAll('.editable').forEach(el => {
        const key = el.getAttribute('data-key');
        textData[key] = el.innerHTML;
    });

    try {
        await setDoc(portfolioDocRef, { texts: textData }, { merge: true });
        alert("Semua perubahan teks berhasil disimpan ke Firebase Cloud!");
    } catch (error) {
        alert("Gagal menyimpan ke Firestore: " + error.message);
    } finally {
        btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Simpan ke Cloud';
    }
});

// =========================================
// 4. UPLOAD GAMBAR HD KE FIREBASE STORAGE
// =========================================
function setupFirebaseImageUpload(inputId, mediaKey, applyCallback) {
    const inputEl = document.getElementById(inputId);

    inputEl.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file || !currentUser) return;

        if (!file.type.startsWith('image/')) {
            alert("Harap pilih file gambar yang valid (JPG, PNG, WEBP).");
            return;
        }

        // Upload file asli resolusi penuh tanpa kompresi ke Firebase Storage
        const storageRef = ref(storage, `portfolio_media/${mediaKey}_${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                uploadProgressText.textContent = `Mengunggah ${mediaKey}: ${progress}%...`;
            },
            (error) => {
                uploadProgressText.textContent = "";
                alert("Gagal mengunggah gambar: " + error.message);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                
                // Simpan URL gambar ke Firestore agar tampil untuk semua pengunjung
                await setDoc(portfolioDocRef, {
                    media: { [mediaKey]: downloadURL }
                }, { merge: true });

                applyCallback(downloadURL);
                uploadProgressText.textContent = "Upload selesai & tersimpan di Cloud!";
                setTimeout(() => { uploadProgressText.textContent = ""; }, 4000);
            }
        );
    });
}

setupFirebaseImageUpload(
    'uploadProfile',
    'profileImage',
    (url) => { document.getElementById('profileImage').src = url; }
);

setupFirebaseImageUpload(
    'uploadBanner',
    'bannerImage',
    (url) => { document.getElementById('home').style.backgroundImage = `url('${url}')`; }
);

setupFirebaseImageUpload(
    'uploadBg',
    'bgImage',
    (url) => { document.body.style.backgroundImage = `url('${url}')`; }
);

// Reset Data di Firestore
document.getElementById('resetAllBtn').addEventListener('click', async () => {
    if (!currentUser) return;
    if (confirm("Yakin ingin mereset semua teks dan gambar di Cloud ke pengaturan awal?")) {
        try {
            await deleteDoc(portfolioDocRef);
            location.reload();
        } catch (error) {
            alert("Gagal mereset data: " + error.message);
        }
    }
});

// =========================================
// 5. NAVIGASI, TYPING EFFECT & FILTER PROYEK
// =========================================
const mobileMenu = document.getElementById('mobile-menu');
const navLinks = document.getElementById('navLinks');

mobileMenu.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
    });
});

const typingText = document.querySelector('.typing-text');
const roles = [
    "Teknik Jaringan Komputer & Telekomunikasi",
    "Network Administrator",
    "Linux System Administrator",
    "Fiber Optic Technician"
];

let roleIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeEffect() {
    const currentRole = roles[roleIndex];
    if (isDeleting) {
        typingText.textContent = currentRole.substring(0, charIndex - 1);
        charIndex--;
    } else {
        typingText.textContent = currentRole.substring(0, charIndex + 1);
        charIndex++;
    }

    let typeSpeed = isDeleting ? 50 : 100;
    if (!isDeleting && charIndex === currentRole.length) {
        typeSpeed = 2000;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        typeSpeed = 500;
    }
    setTimeout(typeEffect, typeSpeed);
}

const filterButtons = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const filterValue = button.getAttribute('data-filter');

        projectCards.forEach(card => {
            if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
                card.classList.remove('hide');
            } else {
                card.classList.add('hide');
            }
        });
    });
});

document.getElementById('contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    alert(`Terima kasih, ${name}! Pesan Anda telah terkirim.`);
    e.target.reset();
});

// Jalankan saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    loadCloudContent();
    typeEffect();
});