import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import ThemeToggler from '../components/ThemeToggler';

const NotFoundPage = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);
// from-slate-900 via-purple-900 to-slate-900
  return (
    <div>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className='fixed top-5 right-5 p-1 rounded-full z-[100000] bg-white'>
                <ThemeToggler/>
            </div>
      <div className="relative z-10 text-center max-w-4xl mx-auto">
        {/* Animated 404 */}
        <div className="mb-8">
          <h1 className="text-8xl md:text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 animate-pulse">
            404
          </h1>
          <div className="h-2 w-32 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mx-auto mt-4 animate-pulse"></div>
        </div>

        {/* Main content */}
        <div className="mb-12 space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-main mb-4">
            Oops! Page Not Found
          </h2>
          <p className="text-lg md:text-xl text-muted mb-2 leading-relaxed">
            The page you're looking for seems to have vanished into the digital void.
          </p>
          <p className="text-base text-muted">
            Don't worry, even the best explorers sometimes take a wrong turn.
          </p>
        </div>
        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <button 
            onClick={() => window.history.back()}
            className="group flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full transition-all duration-300 hover:from-purple-700 hover:to-pink-700 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25 transform"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            Go Back
          </button>
          
          <button 
            onClick={() => window.location.href = '/'}
            className="group flex items-center px-8 py-4 bg-surface text-main font-semibold rounded-full border border-muted transition-all duration-300 hover:bg-white/20 hover:scale-105 hover:shadow-xl hover:shadow-white/10 transform"
          >
            <Home className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
            Go Home
          </button>
        </div>
        <div className="mt-8 p-4 bg-card border border-border rounded-lg">
        <p className="text-muted-foreground">
            Auto-redirecting in{' '}
            <span className="font-mono text-lg text-primary font-bold">
            {countdown}
            </span>{' '}
            seconds
        </p>
        <div className="mt-2 w-full bg-muted rounded-full h-1.5">
            <div
            className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${(10 - countdown) * 10}%` }}
            />
        </div>
      </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-wrap justify-center gap-6 text-gray-400">
            <a href="#" className="hover:text-purple-400 transition-colors duration-300">Help Center</a>
            <a href="#" className="hover:text-purple-400 transition-colors duration-300">Contact Support</a>
            <a href="#" className="hover:text-purple-400 transition-colors duration-300">Site Map</a>
            <a href="#" className="hover:text-purple-400 transition-colors duration-300">Report Issue</a>
          </div>
        </div>
      </div>      
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-ping animation-delay-1000"></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-pink-400 rounded-full animate-ping animation-delay-3000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping animation-delay-2000"></div>
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-purple-400 rounded-full animate-ping animation-delay-4000"></div>
      </div>
    </div>       
    </div>
  );
};

export default NotFoundPage;