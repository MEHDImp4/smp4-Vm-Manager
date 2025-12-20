import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAuth = () => {
            const userStr = localStorage.getItem("user");
            if (!userStr) {
                setLoading(false);
                return;
            }

            try {
                const user = JSON.parse(userStr);
                if (user.role === 'admin') {
                    setIsAdmin(true);
                }
            } catch (e) {
                console.error("Auth check error", e);
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />; // or to /login
    }

    return <>{children}</>;
};

export default AdminRoute;
