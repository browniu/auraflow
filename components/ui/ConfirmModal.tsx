import React from 'react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform animate-scale-in border border-brand-gold/20">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onCancel}>
              取消
            </Button>
            <Button variant="danger" onClick={onConfirm}>
              确认
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};