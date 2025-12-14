.PHONY: help install test test-watch test-ui test-coverage clean dev build docker-build docker-up docker-down docker-logs docker-clean

# Default target
help:
	@echo "Available commands:"
	@echo "  make install        - Install dependencies"
	@echo "  make test          - Run tests"
	@echo "  make test-watch    - Run tests in watch mode"
	@echo "  make test-ui       - Run tests with UI"
	@echo "  make test-coverage - Run tests with coverage report"
	@echo "  make dev           - Start development server"
	@echo "  make clean         - Clean node_modules and coverage"
	@echo "  make docker-build  - Build Docker image"
	@echo "  make docker-up     - Start Docker containers"
	@echo "  make docker-down   - Stop Docker containers"
	@echo "  make docker-logs   - View Docker logs"
	@echo "  make docker-clean  - Remove Docker containers and images"

# Install dependencies
install:
	npm install

# Testing
test:
	npm test

test-watch:
	npm run test:watch

test-ui:
	npm run test:ui

test-coverage:
	npm run test:coverage

# Development
dev:
	node server.js

# Clean
clean:
	rm -rf node_modules coverage

# Docker commands
docker-build:
	docker-compose build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-clean:
	docker-compose down -v --rmi all

docker-restart: docker-down docker-up
