import React, { useState, useEffect } from "react";
import Toast from "react-bootstrap/Toast";


interface Props {
  handleRemove: () => void;
  title: string;
  text: string;
  variant: 'danger' | 'light';
  delay?: number;
}

export default function AddToast({ handleRemove, title, text, variant, delay = 3000 }: Props) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(true);
  }, []);
  return (
    <Toast delay={delay} show={show} onClose={() => { handleRemove(); setShow(false); }} bg={variant} autohide>
      <Toast.Header>
        <strong className="me-auto">{title}</strong>
      </Toast.Header>
      <Toast.Body>{text}</Toast.Body>
    </Toast>
  );
};