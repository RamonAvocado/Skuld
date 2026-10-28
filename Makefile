dev-up:
	sudo docker compose -f docker/docker-compose.dev.yaml up -d

dev-build:
	sudo docker compose -f docker/docker-compose.dev.yaml up --build -d

dev-down:
	sudo docker compose -f docker/docker-compose.dev.yaml down

dev-logs:
	sudo docker logs skuld-dev -f


.PHONY: dev-up dev-down dev-logs
