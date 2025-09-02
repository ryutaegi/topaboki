import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; // jwt-decode 임포트

interface JwtPayload {
  isRegistrationComplete?: boolean;
}

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  console.log('authcallback실행됨');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    
    if (token) {
      localStorage.setItem('jwt_token', token);
      console.log('authcallback useeffect 실행됨');
     
      try {
        const decodedToken = jwtDecode<JwtPayload>(token);
        if (decodedToken.isRegistrationComplete === false) {
          navigate('/complete-google-registration'); // 추가 정보 입력 페이지로 리다이렉트
        } else {
          navigate('/'); // 로그인 후 메인 페이지로 리다이렉트
        }
      } catch (error) {
        console.error('Failed to decode JWT:', error);
        navigate('/login'); // 디코딩 실패 시 로그인 페이지로
      }
    } else {
      // 토큰이 없는 경우 로그인 페이지로 리다이렉트 또는 오류 메시지 표시
      navigate('/login');
    }
  }, [location, navigate]);

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Processing Google Login...</h1>
      <p>Please wait while we log you in.</p>
    </div>
  );
};

export default AuthCallbackPage;
