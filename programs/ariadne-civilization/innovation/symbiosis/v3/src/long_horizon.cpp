/*
 * ATLAS ARIADNE deterministic 1,728 x 1,728 fictional-horizon research testbed.
 * Copyright 2026. Original implementation; C++17 standard library only.
 * One scenario covers 1,728 fictional years using 36 modeled 48-year epochs.
 * These are discrete synthetic epochs, not actual autonomous agents, lives,
 * historical forecasts, scientific validation, or 5bn physical CPU steps.
 * Trust is supplied by owner-private source preflight, not the caller's hash.
 */
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>
using namespace std;
static constexpr int NODES=1728, REPEATS=1728, EPOCHS=36, YEARS_PER_EPOCH=48;
static constexpr uint64_t SALT=0x9e3779b97f4a7c15ULL;
static uint64_t mix(uint64_t &x){uint64_t z=(x+=SALT);z=(z^(z>>30))*0xbf58476d1ce4e5b9ULL;z=(z^(z>>27))*0x94d049bb133111ebULL;return z^(z>>31);}
static double uniform(uint64_t &x){return static_cast<double>(mix(x)>>11)*(1.0/9007199254740992.0);}
static double clamp01(double x){return max(0.0,min(1.0,x));}
struct Node{int ord, house,sphere,kind,changed;uint64_t seed;};
struct Policy{double coverage,uncertainty,stock,minStock,calibration,cost;bool feasible=true;};
#pragma pack(push,1)
struct Record{uint16_t node,repeat;uint16_t score[3],stock[3];uint8_t winner,flags;uint16_t marker;};
#pragma pack(pop)
static_assert(sizeof(Record)==20,"receipt ABI must be 20 bytes");
struct Count{uint64_t cases=0,valid[3]={0,0,0},wins[4]={0,0,0,0},noViable=0,methods=0,syntheticUnbound=0,stressRuns=0,modelAgreement=0,metaBetter=0,flatBetter=0,scoreEqual=0;double scoreSum[3]={0,0,0},stockMin[3]={1,1,1};};
static void add(Count& c,const array<Policy,3>& ps,const Record& out,bool meta,bool bound,bool stress){
 c.cases++;c.methods+=meta;c.syntheticUnbound+=meta&&!bound;c.stressRuns+=stress;
 for(int i=0;i<3;i++){c.valid[i]+=ps[i].feasible;c.scoreSum[i]+=(ps[i].feasible?ps[i].calibration:0.0);c.stockMin[i]=min(c.stockMin[i],ps[i].minStock);}
 c.wins[out.winner]++;c.noViable+=out.winner==3;
 if(ps[0].feasible&&ps[2].feasible){
   double d=ps[2].calibration-ps[0].calibration;
   c.metaBetter+=d>0.001;c.flatBetter+=d<-0.001;c.scoreEqual+=fabs(d)<=0.001;
 }
}
static string jsonCount(const Count& c){
 ostringstream s;s<<setprecision(10)<<"{\"cases\":"<<c.cases<<",\"feasible\":["<<c.valid[0]<<","<<c.valid[1]<<","<<c.valid[2]<<"],\"wins\":["<<c.wins[0]<<","<<c.wins[1]<<","<<c.wins[2]<<","<<c.wins[3]<<"],\"noViable\":"<<c.noViable<<",\"epistemicRuns\":"<<c.methods<<",\"syntheticUnboundSubject\":"<<c.syntheticUnbound<<",\"stressScenarios\":"<<c.stressRuns<<",\"metaBetterThanFlat\":"<<c.metaBetter<<",\"flatBetterThanMeta\":"<<c.flatBetter<<",\"flatMetaWithinTolerance\":"<<c.scoreEqual<<",\"sumFeasibleScores\":["<<c.scoreSum[0]<<","<<c.scoreSum[1]<<","<<c.scoreSum[2]<<"],\"minimumSyntheticStocks\":["<<c.stockMin[0]<<","<<c.stockMin[1]<<","<<c.stockMin[2]<<"]}";return s.str();
}
static array<Policy,3> runScenario(const Node& node,int repeat,bool& metaSubjectBound,bool& stressRun){
 uint64_t x=node.seed^(static_cast<uint64_t>(repeat+1)*0xd2b74407b1ce6e93ULL);
 const double align=uniform(x),cross=uniform(x),shockiness=uniform(x),seedStock=uniform(x),calibrationNeed=uniform(x),unexplored=1.0-static_cast<double>(node.changed)/420.0;
 const bool stress=shockiness<0.29;
 stressRun=stress;
 metaSubjectBound=!node.kind||((mix(x)%17ULL)!=0ULL); // synthetic subject link, NOT a verified research subject
 const bool sourceShapeValid=(mix(x)%101ULL)!=0ULL; // negative-control fixture, NOT real IAM
 const double minStockAllowed=stress?0.32:0.25;
 array<Policy,3> p{};
 for(int i=0;i<3;i++){
  p[i].coverage=0.11+0.20*(1-unexplored)+0.12*align;
  p[i].uncertainty=0.68+0.16*unexplored+0.08*calibrationNeed;
  p[i].stock=0.53+0.38*seedStock;
  p[i].minStock=p[i].stock;
  p[i].cost=0;
  p[i].feasible=sourceShapeValid&&metaSubjectBound;
 }
 for(int epoch=0;epoch<EPOCHS;epoch++){
  const double common=uniform(x),shift=uniform(x);
  const double shock=(stress?0.011:0.002)+(common>0.92?(stress?0.022:0.007):0.0);
  const double regen=0.022+(1-common)*0.004;
  for(int i=0;i<3;i++){
   auto& a=p[i];
   // All arms receive exactly ONE synthetic inquiry effort unit per epoch.
   // They route that unit differently, no extra source/model calls given to META.
   double efficiency= i==0?(0.65+0.55*(1.0-cross)):
                       i==1?(0.66+0.56*align):
                            (0.55+0.78*cross-0.15*calibrationNeed);
   efficiency=max(0.1,efficiency);
   const double learning=(0.027+0.006*shift)*efficiency;
   a.coverage=clamp01(a.coverage+(1-a.coverage)*learning);
   a.uncertainty=clamp01(a.uncertainty*(1-0.015*efficiency)+0.0003*shock);
   const double conservation=i==0?0.0:i==1?0.003*(0.3+align):0.0035*(0.25+cross);
   const double draw=0.023+0.003*calibrationNeed-conservation;
   a.stock=clamp01(a.stock+regen-draw-shock);
   a.minStock=min(a.minStock,a.stock);
   if(a.stock<minStockAllowed) a.feasible=false; // non-offsettable ecological/resource floor
   a.cost+=1.0; // exactly equal Work inquiry budget for all strategies
  }
 }
 for(int i=0;i<3;i++){
  auto& a=p[i];
  // Model 
  // Scores are fictional model utilities, not measured accuracy, welfare or empirical evidence.
  const double predicted=0.62*a.coverage+0.28*(1-a.uncertainty)+0.10*a.stock;
  const double overhead=i==0?0.0:i==1?0.009:0.022;
  const double dissentPenalty=0.023*unexplored*(i==0?1.0:i==1?0.84:0.62);
  a.calibration=clamp01(predicted-overhead-dissentPenalty);
 }
 return p;
}
static uint16_t q(double x){return static_cast<uint16_t>(llround(clamp01(x)*65535.0));}
int main(int argc,char** argv){
 if(argc!=6){cerr<<"USAGE: long_horizon SEED_TSV HOUSE_INDEX(1..12) REPEATS(1..1728) OUT_BIN OUT_JSON\n";return 2;}
 const string input=argv[1],outBin=argv[4],outJSON=argv[5];int house=atoi(argv[2]),repeats=atoi(argv[3]);
 if(house<1||house>12||repeats<1||repeats>1728){cerr<<"INVALID_SCOPE\n";return 3;}
 ifstream fin(input);if(!fin){cerr<<"SOURCE_MISSING\n";return 4;}
 vector<Node> nodes;int n=0,h=0,s=0,k=0,ch=0;uint64_t seed=0;
 while(fin>>n>>h>>s>>k>>ch>>seed){
  if(n<0||n>=1728||h!=n/144+1||s!=(n%144)/12+1||k!=((s>7)?1:0)||ch<0||ch>420){cerr<<"BAD_SOURCE_INDEX\n";return 5;}
  nodes.push_back({n,h,s,k,ch,seed});
 }
 if(nodes.size()!=NODES){cerr<<"SOURCE_CARDINALITY\n";return 6;}
 FILE* f=fopen(outBin.c_str(),"wb");if(!f){cerr<<"CANNOT_OPEN_OUTPUT\n";return 7;}
 Count total;vector<pair<int,Count>> nodeCounts;
 for(const auto& node:nodes){
  if(node.house!=house)continue;
  Count cnt;
  for(int rep=0;rep<repeats;rep++){
   bool bound=false,stress=false;auto p=runScenario(node,rep,bound,stress);
   int win=3;double best=-1;
   for(int i=0;i<3;i++)if(p[i].feasible&&p[i].calibration>best+1e-12){best=p[i].calibration;win=i;}
   Record rec{};rec.node=static_cast<uint16_t>(node.ord);rec.repeat=static_cast<uint16_t>(rep);rec.winner=static_cast<uint8_t>(win);
   rec.flags=static_cast<uint8_t>((p[0].feasible?1:0)|(p[1].feasible?2:0)|(p[2].feasible?4:0)|(bound?8:0)|(stress?16:0));
   rec.marker=0xA145;
   for(int i=0;i<3;i++){rec.score[i]=q(p[i].calibration);rec.stock[i]=q(p[i].minStock);}
   if(fwrite(&rec,sizeof(rec),1,f)!=1){fclose(f);cerr<<"WRITE_FAILED\n";return 8;}
   add(total,p,rec,node.kind,bound,stress);add(cnt,p,rec,node.kind,bound,stress);
  }
  nodeCounts.emplace_back(node.ord,cnt);
 }
 fclose(f);
 ofstream o(outJSON);if(!o){cerr<<"REPORT_FAILED\n";return 9;}
 o<<"{\n\"schema\":\"atlas.ariadne.long-horizon.synthetic.v1\",\n\"status\":\"EXECUTED_SYNTHETIC_NOT_HOSTED\",\n"
   "\"house\":\"H"<<setw(2)<<setfill('0')<<house<<"\",\n\"sourceNodes\":144,\n\"repeatsPerNode\":"<<repeats<<",\n\"fictionalYearsPerScenario\":1728,\n\"epochsPerScenario\":36,\n\"fictionalYearsPerEpoch\":48,\n\"modelPolicyNames\":[\"FLAT_EQUAL_BUDGET\",\"SPHERE_EQUAL_BUDGET\",\"META145_EQUAL_BUDGET\"],\n"
   "\"sourceCoordinatesOriginalRegistryReverified\":false,\n\"externalModelCalls\":0,\n\"actualMacroturns\":0,\n\"semanticEdgesAccepted\":0,\n\"hostRightsVerified\":false,\n\"authorityEffect\":\"NONE\",\n\"aggregate\":"<<jsonCount(total)<<",\n\"nodes\":[\n";
 for(size_t i=0;i<nodeCounts.size();i++)
   o<<"{\"ordinal\":"<<nodeCounts[i].first<<",\"aggregate\":"<<jsonCount(nodeCounts[i].second)<<"}"<<(i+1<nodeCounts.size()?",\n":"\n");
 o<<"]\n}\n";
 cout<<"H"<<house<<" scenarios="<<total.cases<<" winner_META="<<total.wins[2]<<" noViable="<<total.noViable<<"\n";
 return nodeCounts.size()==144&&total.cases==static_cast<uint64_t>(144)*repeats?0:10;
}
