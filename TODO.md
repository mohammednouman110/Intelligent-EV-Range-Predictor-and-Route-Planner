# Task: Fix pydantic-core wheel build failure on Python 3.14

## Root cause
- Environment uses Python 3.14.6.
- `requirements.txt` pins `pydantic==2.9.2`, whose `pydantic-core` has no
  prebuilt wheel for Python 3.14 → pip falls back to a source build.
- Source build requires `maturin` + Rust toolchain (`cargo`), which are not
  installed on this machine → `Failed building wheel for pydantic-core`.

## Steps
- [x] Diagnose environment (Python 3.14, no maturin/cargo).
- [x] Agree fix plan with user.
- [x] Update `backend/requirements.txt` to pydantic 2.13.4 (ships prebuilt
      pydantic-core wheel `2.46.4-cp314-cp314-win_amd64` for Python 3.14).
- [x] Create a Python 3.14 venv at `backend/.venv314` and reinstall dependencies.
- [x] Verify install succeeds — pydantic-core installed as a prebuilt wheel
      (no maturin/cargo source build), and all imports (fastapi, supabase,
      pydantic_settings) resolve correctly.
