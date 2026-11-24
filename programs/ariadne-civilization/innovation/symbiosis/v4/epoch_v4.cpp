/* Ariadne v4 · deterministic four-policy 1728 x 1728 synthetic research laboratory.
   Original code, stdlib C++17. NOT a physical forecast, model run, resident or rights grant.
   36 simulated epochs x 48 hypothetical years = 1728 fictional years per scenario.
   Do not infer semantic node equivalence from positional HSN identity.
*/
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>
using namespace std;
static constexpr int N=1728,R=1728,E=36,Y=48,P=4;
static constexpr uint64_t SALT=0xb5ad4eceda1ce145ULL; // different from v3; new world seed
static uint64_t mix(uint64_t&x){uint64_t z=(x+=0x9e3779b97f4a7c15ULL);z=(z^(z>>30))*0xbf58476d1ce4e5b9ULL;z=(z^(z>>27))*0x94d049bb133111ebULL;return z^(z>>31);}
static double rnd(uint64_t&x){return double(mix(x)>>11)*(1.0/9007199254740992.0);}
static double clip(double a){return max(0.0,min(1.0,a));}
static uint16_t quant(double a){return uint16_t(llround(clip(a)*65535));}
struct Node{int id,h,s,meta,changed;uint64_t seed;};
struct Strategy{double coverage,unknown,water,energy,minWater,minEnergy,cost,score;bool valid;};
#pragma pack(push,1)
struct Record{uint16_t node,repeat,score[P],minStock[P];uint8_t selected,feasibleMask,flags,accepted;uint16_t magic;};
#pragma pack(pop)
static_assert(sizeof(Record)==26,"v4 wire 26-byte receipt");
struct Totals{uint64_t n=0,selected[5]={0,0,0,0,0},feasible[4]={0,0,0,0},sourceHolds=0,subjectHolds=0,stressCases=0,budgetViolation=0;double conditionalScore[4]={0,0,0,0};};
static string summary(const Totals&c){ostringstream o;o<<setprecision(13)<<"{\"scenarios\":"<<c.n<<",\"wins\":["<<c.selected[0]<<","<<c.selected[1]<<","<<c.selected[2]<<","<<c.selected[3]<<","<<c.selected[4]<<"],\"feasible\":["<<c.feasible[0]<<","<<c.feasible[1]<<","<<c.feasible[2]<<","<<c.feasible[3]<<"],\"sourceHolds\":"<<c.sourceHolds<<",\"subjectHolds\":"<<c.subjectHolds<<",\"stressCases\":"<<c.stressCases<<",\"budgetViolation\":"<<c.budgetViolation<<",\"validScoreSum\":["<<c.conditionalScore[0]<<","<<c.conditionalScore[1]<<","<<c.conditionalScore[2]<<","<<c.conditionalScore[3]<<"]}";return o.str();}
static bool simulate(const Node&node,int rep,array<Strategy,P>&a,bool&src,bool&bound,bool&stress,int wave){
 const uint64_t seedSalt=(wave==0?SALT:(SALT^0xd73ca422fa915105ULL));
 uint64_t x=node.seed^seedSalt^(uint64_t(rep+1729)*0x94d049bb133111ebULL);
 double align=rnd(x),cross=rnd(x),difficulty=rnd(x),water0=rnd(x),energy0=rnd(x),method=rnd(x),innovation=double(node.changed)/420.0;
 // A common epoch disturbance links House-level outcomes; not an empirical dependence model.
 uint64_t common=seedSalt^uint64_t(rep+1729)*0x632be59bd9b4e019ULL^uint64_t(node.h)*0x9e3779b97f4a7c15ULL;
 stress=(mix(common)%100)<37;
 src=(mix(x)%103)!=0;bound=!node.meta || (mix(x)%23)!=0;
 const double waterFloor=stress?0.22:0.16, energyFloor=stress?0.23:0.17;
 for(int i=0;i<P;i++){a[i]={0.12+0.20*innovation+0.11*align,0.73+0.10*difficulty,0.49+0.46*water0,0.48+0.45*energy0,0.49+0.46*water0,0.48+0.45*energy0,0,0,src&&bound};}
 for(int epoch=0;epoch<E;epoch++){
  // Shared correlated signal (node-specific variation already in x), across all four policies.
  const double env=rnd(common),swing=rnd(x);const double burst=(stress&&env>0.79?0.035:0)+(env>0.953?0.018:0);
  for(int i=0;i<P;i++){
   Strategy& p=a[i];
   double efficiency= i==0?(0.63+0.43*(1-cross)):i==1?(0.66+0.50*align):i==2?(0.60+0.59*cross):(0.57+0.38*cross+0.21*method);
   efficiency=max(0.10,efficiency);
   p.coverage=clip(p.coverage+(1-p.coverage)*(0.026+0.008*swing)*efficiency);
   p.unknown=clip(p.unknown*(1-0.014*efficiency));
   double conserveWater=(i==0?0.00:i==1?0.0021:i==2?0.0028:0.0035)*(0.60+align);
   double conserveEnergy=(i==0?0.00:i==1?0.0018:i==2?0.0022:0.0038)*(0.60+cross);
   p.water=clip(p.water+0.026+(1-env)*0.003-0.027-0.004*difficulty+conserveWater-burst);
   p.energy=clip(p.energy+0.023+(1-env)*0.004-0.025-0.004*difficulty+conserveEnergy-burst*0.8);
   p.minWater=min(p.minWater,p.water);p.minEnergy=min(p.minEnergy,p.energy);
   if(p.water<waterFloor||p.energy<energyFloor)p.valid=false; // no compensating stock losses
   p.cost+=1.0; // same investigation budget for all
  }
 }
 for(int i=0;i<P;i++){
  Strategy& p=a[i];p.score=clip(0.60*p.coverage+0.25*(1-p.unknown)+0.075*p.water+0.075*p.energy
    -(i==0?0:i==1?0.008:i==2?0.019:0.028)-0.010*difficulty*(i==0?1.1:0.8));
 }
 return src&&bound;
}
int main(int argc,char**argv){
 if(argc!=6 && argc!=7){cerr<<"usage epoch_v4 SEEDS HOUSE REPEATS OUTPUT.bin OUTPUT.json [WAVE=0|1]\n";return 2;}
 int house=atoi(argv[2]),reps=atoi(argv[3]),wave=(argc==7?atoi(argv[6]):0);if(wave<0||wave>1||house<1||house>12||reps<1||reps>1728){cerr<<"BAD_SCOPE\n";return 3;}
 ifstream in(argv[1]);if(!in){cerr<<"SOURCE_UNAVAILABLE\n";return 4;}
 vector<Node> nodes;Node n{};vector<int> seen(N,0);
 while(in>>n.id>>n.h>>n.s>>n.meta>>n.changed>>n.seed){
  if(n.id<0||n.id>=N||n.h!=n.id/144+1||n.s!=(n.id%144)/12+1||n.meta!=(n.s>7?1:0)||n.changed<0||n.changed>420||seen[n.id]++){cerr<<"INVALID_SOURCE_INDEX\n";return 5;}
  nodes.push_back(n);
 }
 if(nodes.size()!=N||!all_of(seen.begin(),seen.end(),[](int a){return a==1;})){cerr<<"SOURCE_CARDINALITY\n";return 6;}
 FILE* out=fopen(argv[4],"wb");if(!out){cerr<<"WRITE_FAILED\n";return 7;}
 Totals totals;int houseNodes=0;
 for(const auto&node:nodes){if(node.h!=house)continue;++houseNodes;
  for(int rep=0;rep<reps;rep++){
   array<Strategy,P> a{};bool src=false,bound=false,stress=false;simulate(node,rep,a,src,bound,stress,wave);
   Record row{};row.node=uint16_t(node.id);row.repeat=uint16_t(rep);row.selected=4;row.flags=(src?1:0)|(bound?2:0)|(stress?4:0);row.magic=uint16_t(0xA146+wave);
   int best=4;double reward=-1;
   for(int i=0;i<P;i++){
    row.score[i]=quant(a[i].score);row.minStock[i]=quant(min(a[i].minWater,a[i].minEnergy));
    if(a[i].valid){row.feasibleMask|=uint8_t(1<<i);totals.feasible[i]++;totals.conditionalScore[i]+=a[i].score;
     if(a[i].score>reward+1e-12){reward=a[i].score;best=i;}}
    if(a[i].cost!=E){totals.budgetViolation++;}
   }
   row.selected=uint8_t(best);row.accepted=0; // cannot make a reviewed scientific edge
   if(fwrite(&row,sizeof(row),1,out)!=1){fclose(out);cerr<<"WRITE_FAILED\n";return 8;}
   totals.n++;totals.selected[best]++;totals.sourceHolds+=!src;totals.subjectHolds+=!bound;totals.stressCases+=stress;
  }
 }
 fclose(out);if(houseNodes!=144||totals.n!=uint64_t(144)*reps){cerr<<"CARDINALITY\n";return 9;}
 ofstream report(argv[5]);if(!report){cerr<<"JSON_WRITE_FAILED\n";return 10;}
 report<<"{\n\"schema\":\"atlas.ariadne.v4.synthetic-epochs/v1\",\n\"status\":\"SYNTHETIC_SIMULATION_ONLY_NOT_HOSTED\",\n\"house\":"<<house<<",\"wave\":"<<wave<<",\"nodes\":144,\"repeatsPerNode\":"<<reps<<",\"fictionalYearsPerScenario\":1728,\"modeledEpochsPerScenario\":36,\"yearsPerEpoch\":48,\"originalRegistryRehashed\":false,\"modelCalls\":0,\"genuineMacroturns\":0,\"scientificEdgesAccepted\":0,\"hostRightsVerified\":false,\"effects\":0,\"authorityEffect\":\"NONE\",\"summary\":"<<summary(totals)<<"}\n";
 cout<<"H"<<house<<" cases="<<totals.n<<" no_viable="<<totals.selected[4]<<" meta_robust="<<totals.selected[3]<<"\n";
}
