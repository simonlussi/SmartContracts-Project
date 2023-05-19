build:
	docker-compose up -d --build --force-recreate
prod:
	docker-compose up -d
stop:
	docker-compose down

build-dev:
	docker-compose -f docker-compose.dev.yml up -d --build --force-recreate
dev:
	docker-compose -f docker-compose.dev.yml up -d
stop-dev:
	docker-compose -f docker-compose.dev.yml down

clean:
	backend\node_modules\.bin\rimraf volumes