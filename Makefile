REPORTER = spec
BIN = ./node_modules/.bin

build_test:
		npm install --prefix ./test/testProject

test:
		$(BIN)/mocha --reporter $(REPORTER) --ui bdd ./test/*

.PHONY: build_test test