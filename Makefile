dev-up:
	sudo docker compose -f docker/docker-compose.dev.yaml up -d

dev-down:
	sudo docker compose -f docker/docker-compose.dev.yaml down

dev-logs:
	sudo docker logs skuld-dev -f
