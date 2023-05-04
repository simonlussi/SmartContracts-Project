import React, { useState, ForwardedRef, forwardRef, useImperativeHandle } from 'react';
import ToastContainer from 'react-bootstrap/ToastContainer';
import Toast from 'react-bootstrap/Toast';

export type NotificationsElement = HTMLDivElement & {
  setWarning: (_errorMessage: string) => void;
  setInfo: (_infoMessage: string) => void;
  setFlashInfo: (_infoMessage: string) => void;
  setSuccess: (_successMessage: string) => void;
};

export interface Notification {
  id: number;
  title: string;
  text: string;
  variant: string;
  delay: number;
}

const Notifications = forwardRef((props, ref: ForwardedRef<NotificationsElement>) => {
  const [toasts, setToasts] = useState<Notification[]>([]);

  const removeToast = (id: number) => {
    setToasts((toasts) => toasts.filter((e) => e.id !== id));
  };

  useImperativeHandle(
    ref,
    () =>
      ({
        setWarning(_errorMessage: string): void {
          setToasts((toasts) => [
            ...toasts,
            { id: Math.random(), title: 'Warning!', text: _errorMessage, variant: 'danger', delay: 10000 },
          ]);
        },
        setInfo(_infoMessage: string): void {
          setToasts((toasts) => [...toasts, { id: Math.random(), title: 'Info!', text: _infoMessage, variant: 'light', delay: 5000 }]);
        },
        setFlashInfo(_infoMessage: string): void {
          setToasts((toasts) => [...toasts, { id: Math.random(), title: 'Info!', text: _infoMessage, variant: 'light', delay: 500 }]);
        },
        setSuccess(_successMessage: string): void {
          setToasts((toasts) => [
            ...toasts,
            { id: Math.random(), title: 'Success!', text: _successMessage, variant: 'success', delay: 5000 },
          ]);
        },
      } as NotificationsElement),
  );

  return (
    <ToastContainer position='top-end'>
      {toasts.map(({ id, title, text, variant, delay }) => (
        <Toast
          key={id}
          delay={delay}
          onClose={() => {
            removeToast(id);
          }}
          bg={variant}
          autohide
        >
          <Toast.Header>
            <strong className='me-auto'>{title}</strong>
          </Toast.Header>
          <Toast.Body>{text}</Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
});

export default Notifications;
