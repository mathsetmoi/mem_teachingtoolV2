# Envoie des touches au serveur X (XTest, par ctypes) : à la fenêtre qui a
# le focus (la fenêtre GTK « Enregistrer » de Chromium, par exemple).
# Usage : python3 touches.py "ctrl+a" "texte:/chemin/fichier.memc" "Return"
import ctypes, sys, time
x = ctypes.cdll.LoadLibrary('libX11.so.6')
t = ctypes.cdll.LoadLibrary('libXtst.so.6')
x.XOpenDisplay.restype = ctypes.c_void_p
x.XStringToKeysym.restype = ctypes.c_ulong
x.XKeysymToKeycode.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
t.XTestFakeKeyEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint, ctypes.c_int, ctypes.c_ulong]
x.XFlush.argtypes = [ctypes.c_void_p]
d = x.XOpenDisplay(None)
if not d:
    sys.exit('pas de serveur X')
NOMS = {'/': 'slash', '.': 'period', '-': 'minus', '_': 'underscore', ' ': 'space', ':': 'colon'}
MAJ = set('_:') | set('ABCDEFGHIJKLMNOPQRSTUVWXYZ')

def code(nom):
    return x.XKeysymToKeycode(d, x.XStringToKeysym(nom.encode()))

def appui(nom, maj=False):
    shift = code('Shift_L')
    if maj:
        t.XTestFakeKeyEvent(d, shift, 1, 0)
    c = code(nom)
    t.XTestFakeKeyEvent(d, c, 1, 0); t.XTestFakeKeyEvent(d, c, 0, 0)
    if maj:
        t.XTestFakeKeyEvent(d, shift, 0, 0)
    x.XFlush(d); time.sleep(0.03)

t.XTestFakeMotionEvent.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_ulong]
t.XTestFakeButtonEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint, ctypes.c_int, ctypes.c_ulong]
for a in sys.argv[1:]:
    if a.startswith('clic:'):
        cx, cy = (int(v) for v in a[5:].split(','))
        t.XTestFakeMotionEvent(d, -1, cx, cy, 0); x.XFlush(d); time.sleep(0.1)
        t.XTestFakeButtonEvent(d, 1, 1, 0); x.XFlush(d); time.sleep(0.05)
        t.XTestFakeButtonEvent(d, 1, 0, 0); x.XFlush(d)
    elif a.startswith('texte:'):
        for ch in a[6:]:
            appui(NOMS.get(ch, ch), ch in MAJ)
    elif '+' in a:
        mods, touche = a.split('+')[:-1], a.split('+')[-1]
        cm = [code({'ctrl': 'Control_L', 'shift': 'Shift_L', 'alt': 'Alt_L'}[m]) for m in mods]
        for c in cm: t.XTestFakeKeyEvent(d, c, 1, 0)
        appui(touche)
        for c in reversed(cm): t.XTestFakeKeyEvent(d, c, 0, 0)
        x.XFlush(d)
    else:
        appui(a)
    time.sleep(0.15)
x.XFlush(d)
