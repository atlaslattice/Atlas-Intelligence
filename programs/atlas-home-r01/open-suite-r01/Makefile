CC ?= cc
SRC=src/aos_open_suite.c tests/test_c.c
FLAGS=-std=c11 -Wall -Wextra -Werror -pedantic
all: build/policy-test
build/policy-test: $(SRC) src/aos_open_suite.h
	mkdir -p build
	$(CC) $(FLAGS) -O2 $(SRC) -o $@
build/policy-sanitize: $(SRC) src/aos_open_suite.h
	mkdir -p build
	$(CC) $(FLAGS) -O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer -fno-pie -no-pie $(SRC) -o $@
test: build/policy-test build/policy-sanitize
	./build/policy-test
	./build/policy-sanitize
	python3 -m unittest discover -s tests -p 'test_*.py' -v
freestanding:
	$(CC) $(FLAGS) -ffreestanding -fno-builtin -nostdlib -c src/aos_open_suite.c -o build/aos_open_suite_freestanding.o
clean:
	rm -f build/*
.PHONY: all test freestanding clean
