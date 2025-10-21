.PHONY: run dev fmt bootstrap-token

run:
	uvicorn app.main:app --reload --port 8000

bootstrap-token:
	python scripts/bootstrap_service_token.py --api-base http://localhost:8000 --print-token
