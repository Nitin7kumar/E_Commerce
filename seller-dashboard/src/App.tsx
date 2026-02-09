import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import { getCurrentSeller, SellerUser, signOut } from './lib/supabase';
import { Icons } from './components/Icons';

function App() {
    const [seller, setSeller] = useState<SellerUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSeller();
    }, []);

    async function checkSeller() {
        try {
            const currentSeller = await getCurrentSeller();
            setSeller(currentSeller);
        } catch (error) {
            console.error('Error checking seller:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleLogout() {
        await signOut();
        setSeller(null);
    }

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/login"
                    element={
                        seller ? <Navigate to="/" replace /> : <Login onLogin={setSeller} />
                    }
                />
                <Route
                    path="/"
                    element={
                        seller ? (
                            <Layout seller={seller} onLogout={handleLogout}>
                                <Dashboard seller={seller} />
                            </Layout>
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
                <Route
                    path="/products"
                    element={
                        seller ? (
                            <Layout seller={seller} onLogout={handleLogout}>
                                <Products seller={seller} />
                            </Layout>
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

// Layout component with sidebar
function Layout({
    children,
    seller,
    onLogout
}: {
    children: React.ReactNode;
    seller: SellerUser;
    onLogout: () => void;
}) {
    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1><Icons.Store /> Seller Portal</h1>
                    <p className="store-name">{seller.seller?.store_name}</p>
                </div>
                <nav className="sidebar-nav">
                    <a href="/" className="nav-item">
                        <Icons.Dashboard /> Dashboard
                    </a>
                    <a href="/products" className="nav-item">
                        <Icons.Products /> My Products
                    </a>
                    <a href="#" className="nav-item disabled">
                        <Icons.Orders /> Orders (Coming Soon)
                    </a>
                    <a href="#" className="nav-item disabled">
                        <Icons.Settings /> Settings (Coming Soon)
                    </a>
                </nav>
                <div className="sidebar-footer">
                    <p className="account-label">ACCOUNT</p>
                    <p className="email">{seller.email}</p>
                    <button onClick={onLogout} className="logout-btn">
                        <Icons.SignOut /> Sign Out
                    </button>
                </div>
            </aside>
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}

export default App;

