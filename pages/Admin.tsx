
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export const Admin = () => {
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const hasPerm = (key: string) => isAdmin || currentUser?.permissions?.includes(key as any);

  if (isAdmin) return <Navigate to="/admin/organizacao" replace />;
  if (hasPerm('sectors:manage')) return <Navigate to="/admin/setores" replace />;
  if (hasPerm('users:manage')) return <Navigate to="/admin/equipe" replace />;
  if (hasPerm('clients:manage')) return <Navigate to="/admin/clientes" replace />;
  if (hasPerm('finance:manage')) return <Navigate to="/admin/comissoes" replace />;
  
  return <Navigate to="/dashboard" replace />;
};
