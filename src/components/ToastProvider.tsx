// src/components/ToastProvider.tsx
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { Portal } from '@gorhom/portal';

const ToastContext = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const nextId = useRef(0);

  const showToast = (msg: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2200);
  };

  return (
    <>
      <ToastContext.Provider value={showToast}>{children}</ToastContext.Provider>

      {/* 👇 High z-index Portal to ensure it’s on top of nav + modals */}
      <Portal hostName="global-toast">
        {toasts.map((t, i) => (
          <Animated.View
            key={t.id}
            style={[
              styles.toast,
              { bottom: 80 + i * 60, zIndex: 5000 }, // ensures always visible
            ]}
            pointerEvents="none"
          >
            <Text style={styles.toastText}>{t.msg}</Text>
          </Animated.View>
        ))}
      </Portal>
    </>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#2A2F35',
    borderColor: '#D6F031',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 20,
    zIndex:999
  },
  toastText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
  },
});
