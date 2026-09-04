import { Outlet } from 'react-router-dom';
import Header from '../components/Header';

const PublicLayout = () => {
  return (
    <div>
      <Header />
      <Outlet /> {/* This is where your public route content will appear */}
    </div>
  );
};

export default PublicLayout;