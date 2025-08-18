import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import ThemeToggler from './ThemeToggler';

interface AuthPageWrapperProps {
  children: ReactNode;
  isLogin?: boolean;
  details: {
    head: string;
    body: string;
  };
  isverify?: boolean;
  no_action?: boolean;
  action?: () => void;
}

const AuthPageWrapper: React.FC<AuthPageWrapperProps> = ({
  children,
  details,
  isLogin,
  // isverify,
  // no_action,
  // action
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const fromValue = searchParams.get('from');
  console.log({navigate})

  return (
    <div className='bg-background min-h-screen flex flex-col lg:flex-row bg-gree'>
      <main className='w-full p-[62px_24px]  flex flex-col min-h-screen justify-center lg:w-full'>
        <section className='mr-[unset] flex justify-center lg:mr-[50vw]'>
          <div className='w-full max-w-[450px] lg:mx-auto mx-[unset]'>
            <header className='mb-[49px]'>
              <div className='items-start md:items-center lg:items-start flex flex-col mb-[52.33px]'>
                <Logo/>
              </div>
              <div className='md:text-center lg:text-left text-main text-2xl font-bold'>
                {details?.head}
              </div>
              <p className='md:text-center lg:text-left text-[14px] text-muted mt-2 font-bold leading-[150%] tracking-[-0.02em]'>
                {details?.body}
              </p>
            </header>

            {children}

            <section className='aside mt-8 text-[14px] text-center text-main font-bold'>
              {isLogin ? 'New here?' : 'Already have an account?'}{' '}
              <Link
                to={isLogin ? `/signup${fromValue ? `?from=${fromValue}` : ''}` : '/login'}
                className='text-primary hover:text-primary/80 transition-all duration-200'
              >
                {isLogin ? 'Create an account' : 'Log in'}
              </Link>
            </section>
          </div>
        </section>
      </main>

      <aside className='hidden overflow-hidden bg-background lg:flex flex-col relative justify-center lg:fixed lg:right-0 lg:bottom-0 lg:top-0 lg:w-[50vw]'>        
        <div className="relative w-[300px] sm:w-[400px] md:w-[500px] lg:w-[900px] lg:h-full">
            <img
              src="/nft_banner.svg"
              alt="background image"
              className="w-full h-full object-cover"
            />
            <div className='fixed top-5 right-5 p-1 rounded-full z-[100000] bg-white'>
              <ThemeToggler/>
            </div>
          </div>    
      </aside>
    </div>
  );
};

export default AuthPageWrapper;
