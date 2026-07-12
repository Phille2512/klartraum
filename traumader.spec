import sys
from pathlib import Path

block_cipher = None

a = Analysis(
    ['backend/desktop.py'],
    pathex=['backend'],
    binaries=[],
    datas=[('frontend', 'frontend')],
    hiddenimports=[
        'main',
        'auth',
        'database',
        'models',
        'paths',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    cipher=block_cipher,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='Traumader',
    debug=False,
    strip=False,
    upx=True,
    console=True,
    icon='frontend/icons/icon-512.png',
)
