
'use client';
import { useContext } from 'react';
import { UserContext } from '@/firebase/provider';

export const useUser = () => {
  return useContext(UserContext);
};
