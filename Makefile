.PHONY: run dev fmt

run:
	uvicorn app.main:app --reload --port 8000

