CXX ?= g++
CXXFLAGS = -O3 -std=c++17 -Wall -Wextra -Werror -pedantic
all: bin/long_horizon
bin/long_horizon: src/long_horizon.cpp
	mkdir -p bin
	$(CXX) $(CXXFLAGS) $< -o $@
small: all
	mkdir -p reports/smoke
	./bin/long_horizon private-source/source-seeds.txt 1 8 reports/smoke/H01.bin reports/smoke/H01.json
