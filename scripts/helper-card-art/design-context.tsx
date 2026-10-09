// Figma design context for frame 40000473:8671 ("iPad Pro 11' - 226") — helpers onboarding screen.
// Blueprint Hand-off file 5pJKXHl6uEEHzHDBQnoULW. Captured 2026-06-11 via figma-dev-mode MCP.
// The const URLs below are session-ephemeral; the same assets are staged in THIS directory
// as <hash>.svg (e.g. imgPolygon -> 94fc4bbc8a310b536de341ad95338b5dfe8856a7.svg).
// Card order: 8679 sleep / 8680 friends / 8681 meal (SELECTED) / 8682 sport / 8683 art-music / 8684 talk.

const imgProperty1Default = "http://localhost:3845/assets/2a2634a0c1fea51f66c128c829fbded1876f88a5.svg";
const imgVector1 = "http://localhost:3845/assets/b8d6b34c98a6e2945a67411ad66568c364583c65.svg";
const imgProperty1White = "http://localhost:3845/assets/7bd560f2aee3f222770802dce9f4597df4119a7e.svg";
const imgVector = "http://localhost:3845/assets/723164cf6233f783416439ebbcd13f534a1a0d31.svg";
const imgPolygon = "http://localhost:3845/assets/94fc4bbc8a310b536de341ad95338b5dfe8856a7.svg";
const imgGroup111 = "http://localhost:3845/assets/4287125557f500ba716aee5c30ffaf39f402a6c7.svg";
const imgEllipse45 = "http://localhost:3845/assets/2d5f918893fb6de6ca18470b11216675289bf8a7.svg";
const imgShell = "http://localhost:3845/assets/f00ff89e0837a612cfe62b4517a5856482ab9e13.svg";
const imgGroup113 = "http://localhost:3845/assets/19246103f76c299e10d8ca1b380b2451f6f6b3f9.svg";
const imgGroup112 = "http://localhost:3845/assets/aa2e64a4b79e7edd27aa56df3b58ac2694275c69.svg";
const imgSoftFlower = "http://localhost:3845/assets/e99054b1dcecebcd16212d2f4248c287d2b82482.svg";
const imgGroup114 = "http://localhost:3845/assets/db85420683881341dc2a22ab17e6f27f5a3d9409.svg";
const imgGroup115 = "http://localhost:3845/assets/dbd4f0ce8075f154ff593871dc33a35622d732a4.svg";
const imgEllipse22 = "http://localhost:3845/assets/cecf923f43a94ba03a7453292bf7d63faa4e31f7.svg";
const imgPolygon1 = "http://localhost:3845/assets/c761f3536a704dd76ac6977a7c0a767558c8dc0e.svg";
const imgGroup116 = "http://localhost:3845/assets/129c22cee5761ccd110c286a73cf21ce6aea2417.svg";
const imgGroup117 = "http://localhost:3845/assets/4dc86aff60d375472e6b2234da275129e4011d1e.svg";
const imgEllipse46 = "http://localhost:3845/assets/603a3abc455e1fd276c951e69c5b157b1562122d.svg";
const imgAvatar = "http://localhost:3845/assets/e86419dcee6e9db3fbb2381a109e035a1a987f9f.svg";
const imgAvatar1 = "http://localhost:3845/assets/1e5108f78f5209a2817aa67c2d17016a6c1942a2.svg";
const imgFrame1289 = "http://localhost:3845/assets/7cafdd3d17dbcb7a14dc68391bd8638184d77869.svg";
const imgEllipse47 = "http://localhost:3845/assets/648d8d112a50fb73bf67f1f09c9980f3ff7b7517.svg";
const imgGroup119 = "http://localhost:3845/assets/54da48dd165043be82a161dbb3b76ec8853437fe.svg";
const imgGroup118 = "http://localhost:3845/assets/695814ae2e62d1cb4bb5465104b66c4fcc494245.svg";
const imgGroup121 = "http://localhost:3845/assets/4dd7af935593712eeaea080402f44994d5cfa5fe.svg";
type CheckboxVisualProps = {
  className?: string;
  property1?: "Default" | "white";
};

function CheckboxVisual({ className, property1 = "Default" }: CheckboxVisualProps) {
  const isWhite = property1 === "white";
  return (
    <div className={className || "relative size-[36px]"} id={isWhite ? "node-40000333_17584" : "node-40000333_17580"}>
      <img alt="" className="absolute block inset-0 max-w-none size-full" src={isWhite ? imgProperty1White : imgProperty1Default} />
      <div className="absolute bottom-[32.35%] left-[26.47%] right-1/4 top-[32.35%]" id={isWhite ? "node-40000333_17587" : "node-40000333_17583"}>
        <div className="absolute inset-[-10.7%_-9.29%_-23.6%_-7.87%]">
          <img alt="" className="block max-w-none size-full" src={imgVector1} />
        </div>
      </div>
    </div>
  );
}
type ProgressBarProps = {
  className?: string;
  property?: "01" | "04";
};

function ProgressBar({ className, property = "01" }: ProgressBarProps) {
  const is04 = property === "04";
  return (
    <div className={className || "h-[4px] relative w-[756px]"} id={is04 ? "node-40000333_17529" : "node-40000333_17520"}>
      <div className="absolute bg-[var(--colors\/blueprint\/gray\/300,#444450)] h-[4px] left-0 rounded-[99px] top-0 w-[756px]" id={is04 ? "node-40000333_17530" : "node-40000333_17521"} />
      <div className={`${String.raw`absolute bg-[var(--colors\/neutral\/warm\/50,#f2f3e5)] h-[4px] left-0 rounded-[99px] top-0 `}${is04 ? "w-[550px]" : "w-[100px]"}`} id={is04 ? "node-40000333_17531" : "node-40000333_17522"} />
    </div>
  );
}

export default function IPadPro() {
  return (
    <div className="bg-[var(--colors\/neutral\/warm\/1100,#1f1f25)] relative size-full" data-node-id="40000473:8671" data-name="iPad Pro 11' - 226">
      <div className="absolute contents left-[calc(12.5%+69.75px)] top-[60px]" data-node-id="40000473:8867" data-name="Layer 3 progress Bar">
        <ProgressBar className="absolute h-[4px] left-[calc(12.5%+69.75px)] top-[60px] w-[756px]" property="04" />
      </div>
      <div className="absolute contents left-[112px] top-[112px]" data-node-id="40000473:8866" data-name="Layer 2 Content">
        <div className="-translate-x-1/2 absolute bottom-[64px] content-stretch flex gap-[12px] items-center left-1/2" data-node-id="40000473:8674">
          <div className="bg-[var(--dynamic\/fill\/secondary\/default,rgba(255,255,255,0.16))] content-stretch flex gap-[var(--gap\/0,0px)] items-center justify-center max-h-[48px] max-w-[48px] min-h-[48px] min-w-[48px] overflow-clip p-[var(--gap\/0,0px)] relative rounded-[8px] shrink-0 size-[48px]" data-node-id="40000473:8675" data-name="Icon Button">
            <div className="overflow-clip relative shrink-0 size-[20px]" data-node-id="I40000473:8675;4402:73362" data-name="Icon">
              <div className="absolute inset-[17.59%_16.67%]" data-node-id="I40000473:8675;4402:73362;12802:1290" data-name="Vector">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector} />
              </div>
            </div>
          </div>
          <div className="bg-[var(--dynamic\/fill\/primary\/default,#f2f3e5)] content-stretch flex gap-[var(--gap\/4,6px)] h-[48px] items-center justify-center max-h-[48px] min-h-[48px] overflow-clip px-[var(--gap\/9,16px)] py-[var(--gap\/0,0px)] relative rounded-[8px] shadow-[0px_1px_1px_0px_rgba(20,21,26,0.03)] shrink-0 w-[200px]" data-node-id="40000473:8676" data-name="Button">
            <div className="content-stretch flex items-center justify-center px-[var(--gap\/2,2px)] relative shrink-0" data-node-id="I40000473:8676;40000071:7757" data-name="Label">
              <p className="[word-break:break-word] font-[family-name:var(--font\/family\/body,'Barlow:Medium')] leading-[var(--components\/control\/medium,20px)] not-italic relative shrink-0 text-[color:var(--dynamic\/text\/onprimary\/default,#1f1f25)] text-[length:var(--font\/size\/400,16px)] tracking-[var(--font\/spacing\/tight-25,-0.1px)] whitespace-nowrap" data-node-id="I40000473:8676;40000071:7758">
                Next
              </p>
            </div>
          </div>
        </div>
        <div className="-translate-x-1/2 [word-break:break-word] absolute font-['Anton:Regular'] leading-[0] left-[calc(50%+0.5px)] not-italic text-[64px] text-[color:var(--colors\/neutral\/warm\/50,#f2f3e5)] text-center top-[calc(50%-305px)] tracking-[1.5px] w-[613px] whitespace-pre-wrap" data-node-id="40000473:8677">
          <p className="leading-[1.06] mb-0">{`What helps you `}</p>
          <p className="leading-[1.06]">feel good?</p>
        </div>
        <div className="absolute content-stretch cursor-pointer flex gap-[12px] items-center left-[112px] top-[328px]" data-node-id="40000473:8678">
          <button className="block h-[245px] relative shrink-0 w-[195px]" data-node-id="40000473:8679" data-name="Card Ilustration">
            <div className="absolute h-[213px] left-[16px] top-[16px] w-[163px]" data-node-id="I40000473:8679;280:10975">
              <div className="-translate-x-1/2 absolute bg-[var(--colors\/blueprint\/light-blue\/400,#49aee1)] border-16 border-[var(--colors\/blueprint\/gray\/400,#36363f)] border-solid h-[213px] left-1/2 rounded-[12px] top-0 w-[163px]" data-node-id="I40000473:8679;254:10183" />
              <div className="absolute h-[180px] left-0 overflow-clip rounded-[12px] top-0 w-[163px]" data-node-id="I40000473:8679;280:10982" data-name="Illustration-blue">
                <div className="-translate-x-1/2 -translate-y-1/2 absolute bg-[var(--colors\/blueprint\/dark-blue\/200,#cbd1f5)] left-[calc(50%+0.5px)] overflow-clip rounded-[99px] size-[120px] top-1/2" data-node-id="I40000473:8679;280:10982;254:10055" data-name="Avatar">
                  <div className="absolute flex items-center justify-center left-[-8px] size-[137px] top-[12px]">
                    <div className="flex-none rotate-180">
                      <div className="relative size-[137px]" data-node-id="I40000473:8679;280:10982;254:10056" data-name="Polygon">
                        <div className="absolute inset-[2.41%_4.24%_9.55%_4.24%]">
                          <img alt="" className="block max-w-none size-full" src={imgPolygon} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute left-[29.38px] size-[28px] top-[42px]" data-node-id="I40000473:8679;280:10982;254:10057">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup111} />
                  </div>
                  <div className="absolute left-[62.62px] size-[28px] top-[42px]" data-node-id="I40000473:8679;280:10982;254:10059">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup111} />
                  </div>
                  <div className="absolute left-[56px] size-[8px] top-[84px]" data-node-id="I40000473:8679;280:10982;254:10061">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgEllipse45} />
                  </div>
                  <div className="[word-break:break-word] absolute contents font-['Anton:Regular'] leading-[0] left-[66px] not-italic text-[20px] text-[color:var(--colors\/neutral\/warm\/50,#f2f3e5)] text-center top-[12px] uppercase whitespace-nowrap" data-node-id="I40000473:8679;280:10982;254:10062">
                    <div className="-translate-x-1/2 -translate-y-1/2 absolute flex flex-col justify-center left-[70.5px] top-[30.5px]" data-node-id="I40000473:8679;280:10982;254:10063">
                      <p className="leading-[1.05]">z</p>
                    </div>
                    <div className="-translate-x-1/2 -translate-y-1/2 absolute flex flex-col justify-center left-[79.5px] top-[22.5px]" data-node-id="I40000473:8679;280:10982;254:10064">
                      <p className="leading-[1.05]">z</p>
                    </div>
                    <div className="-translate-x-1/2 -translate-y-1/2 absolute flex flex-col justify-center left-[88.5px] top-[26.5px]" data-node-id="I40000473:8679;280:10982;254:10065">
                      <p className="leading-[1.05]">z</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="-translate-x-1/2 absolute contents left-[calc(50%+0.5px)] top-[190px]" data-node-id="I40000473:8679;254:10184">
              <div className="-translate-x-1/2 absolute bg-[var(--colors\/blueprint\/gray\/400,#36363f)] h-[47px] left-[calc(50%+0.5px)] rounded-[12px] top-[190px] w-[124px]" data-node-id="I40000473:8679;254:10185" />
              <div className="-translate-x-1/2 -translate-y-1/2 [word-break:break-word] absolute flex flex-col font-['Anton:Regular'] justify-center leading-[0] left-[calc(50%+0.5px)] not-italic text-[20px] text-[color:var(--colors\/neutral\/warm\/50,#f2f3e5)] text-center top-[214.5px] uppercase whitespace-nowrap" data-node-id="I40000473:8679;254:10186">
                <p className="leading-[1.05]">a good Sleep</p>
              </div>
            </div>
          </button>
          <button className="block h-[245px] relative shrink-0 w-[195px]" data-node-id="40000473:8680" data-name="Card Ilustration">
            <div className="absolute h-[213px] left-[16px] top-[16px] w-[163px]" data-node-id="I40000473:8680;280:10975">
              <div className="-translate-x-1/2 absolute bg-[var(--colors\/blueprint\/light-blue\/400,#49aee1)] border-16 border-[var(--colors\/blueprint\/gray\/400,#36363f)] border-solid h-[213px] left-1/2 rounded-[12px] top-0 w-[163px]" data-node-id="I40000473:8680;254:10183" />
              <div className="absolute h-[180px] left-0 overflow-clip rounded-[12px] top-0 w-[163px]" data-node-id="I40000473:8680;280:10982" data-name="Illustration-blue">
                <div className="-translate-x-1/2 -translate-y-1/2 absolute bg-[var(--colors\/blueprint\/dark-blue\/200,#cbd1f5)] left-[calc(50%-0.28px)] overflow-clip rounded-[92.758px] size-[112.434px] top-[calc(50%+0.22px)]" data-node-id="I40000473:8680;280:10982;280:11427" data-name="Avatar">
                  <div className="-translate-y-1/2 absolute flex h-[129px] items-center justify-center left-[21px] top-[calc(50%+27.28px)] w-[148px]">
                    <div className="flex-none rotate-180">
                      <div className="h-[129px] relative w-[148px]" data-node-id="I40000473:8680;280:10982;280:11526" data-name="Shell">
                        <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgShell} />
                      </div>
                    </div>
                  </div>
                  <div className="-translate-x-1/2 -translate-y-1/2 absolute contents left-[calc(50%+40.59px)] top-[calc(50%-11px)]" data-node-id="I40000473:8680;280:10982;280:11491">
                    <div className="-translate-x-1/2 -translate-y-1/2 absolute content-stretch flex gap-[3.726px] h-[23.932px] items-center left-[calc(50%+40.59px)] top-[calc(50%-11px)] w-[51.59px]" data-node-id="I40000473:8680;280:10982;280:11478">
                      <div className="flex items-center justify-center relative shrink-0">
                        <div className="-scale-y-100 flex-none rotate-180">
                          <div className="relative size-[23.932px]" data-node-id="I40000473:8680;280:10982;280:11479">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup113} />
                          </div>
                        </div>
                      </div>
                      <div className="h-[23.932px] relative shrink-0 w-[23.933px]" data-node-id="I40000473:8680;280:10982;280:11484">
                        <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup112} />
                      </div>
                    </div>
                  </div>
                  <div className="-translate-x-1/2 absolute contents left-[calc(50%-41.49px)] top-[-28px]" data-node-id="I40000473:8680;280:10982;280:11476">
                    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%-41.49px)] size-[115.457px] top-[calc(50%-26.49px)]" data-node-id="I40000473:8680;280:10982;280:11466" data-name="Soft Flower">
                      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSoftFlower} />
                    </div>
                    <div className="-translate-x-1/2 -translate-y-1/2 absolute content-stretch flex gap-[4.507px] h-[24.125px] items-center left-[calc(50%-27.17px)] top-[calc(50%-30.49px)] w-[52.757px]" data-node-id="I40000473:8680;280:10982;280:11467">
                      <div className="relative shrink-0 size-[24.125px]" data-node-id="I40000473:8680;280:10982;280:11468">
                        <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup114} />
                      </div>
                      <div className="relative shrink-0 size-[24.125px]" data-node-id="I40000473:8680;280:10982;280:11471">
                        <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup115} />
                      </div>
                    </div>
                    <div className="-translate-x-1/2 absolute left-[calc(50%-27.17px)] size-[24.124px] top-[25.93px]" data-node-id="I40000473:8680;280:10982;280:11474">
                      <div className="absolute inset-[70.07%_14.64%_0_11.41%]">
                        <img alt="" className="block max-w-none size-full" src={imgEllipse22} />
                      </div>
                    </div>
                  </div>
                  <div className="absolute flex items-center justify-center left-[-6.58px] size-[128.362px] top-[42px]">
                    <div className="flex-none rotate-180">
                      <div className="relative size-[128.362px]" data-node-id="I40000473:8680;280:10982;280:11428" data-name="Polygon">
                        <div className="absolute inset-[2.41%_4.24%_9.55%_4.24%]">
                          <img alt="" className="block max-w-none size-full" src={imgPolygon1} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute left-[27.53px] size-[26.235px] top-[65.84px]" data-node-id="I40000473:8680;280:10982;280:11429">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup116} />
                  </div>
                  <div className="absolute left-[58.67px] size-[26.235px] top-[65.84px]" data-node-id="I40000473:8680;280:10982;280:11433">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup117} />
                  </div>
                  <div className="absolute left-[51.97px] size-[6.98px] top-[99.01px]" data-node-id="I40000473:8680;280:10982;280:11436">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgEllipse46} />
                  </div>
                </div>
              </div>
            </div>
            <div className="-translate-x-1/2 absolute contents left-[calc(50%+0.5px)] top-[190px]" data-node-id="I40000473:8680;254:10184">
              <div className="-translate-x-1/2 absolute bg-[var(--colors\/blueprint\/gray\/400,#36363f)] h-[47px] left-[calc(50%+0.5px)] rounded-[12px] top-[190px] w-[124px]" data-node-id="I40000473:8680;254:10185" />
              <div className="-translate-x-1/2 -translate-y-1/2 [word-break:break-word] absolute flex flex-col font-['Anton:Regular'] justify-center leading-[0] left-[calc(50%+0.5px)] not-italic text-[20px] text-[color:var(--colors\/neutral\/warm\/50,#f2f3e5)] text-center top-[214.5px] uppercase whitespace-nowrap" data-node-id="I40000473:8680;254:10186">
                <p className="leading-[1.05]">friends</p>
              </div>
            </div>
          </button>
          <button className="block h-[245px] relative shrink-0 w-[195px]" data-node-id="40000473:8681" data-name="Card Ilustration">
            <div className="absolute h-[213px] left-[16px] top-[16px] w-[163px]" data-node-id="I40000473:8681;280:11138">
              <div className="-translate-x-1/2 absolute bg-[var(--colors\/blueprint\/light-blue\/400,#49aee1)] border-16 border-[var(--colors\/neutral\/warm\/50,#f2f3e5)] border-solid h-[213px] left-1/2 rounded-[12px] top-0 w-[163px]" data-node-id="I40000473:8681;280:11139" />
              <div className="absolute h-[180px] left-0 overflow-clip rounded-[12px] top-0 w-[163px]" data-node-id="I40000473:8681;280:11140" data-name="Illustration-blue">
                <div className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%-0.5px)] size-[120px] top-1/2" data-node-id="I40000473:8681;280:11140;254:10122" data-name="Avatar">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAvatar} />
                </div>
              </div>
            </div>
            <div className="-translate-x-1/2 absolute contents left-[calc(50%+0.5px)] top-[190px]" data-node-id="I40000473:8681;280:11141">
              <div className="-translate-x-1/2 absolute bg-[var(--colors\/neutral\/warm\/50,#f2f3e5)] h-[47px] left-[calc(50%+0.5px)] rounded-[12px] top-[190px] w-[124px]" data-node-id="I40000473:8681;280:11142" />
              <div className="-translate-x-1/2 -translate-y-1/2 [word-break:break-word] absolute flex flex-col font-['Anton:Regular'] justify-center leading-[0] left-[calc(50%+1px)] not-italic text-[20px] text-[color:var(--colors\/blueprint\/gray\/600,#1f1f25)] text-center top-[214.5px] uppercase whitespace-nowrap" data-node-id="I40000473:8681;280:11143">
                <p className="leading-[1.05]">a Good meal</p>
              </div>
            </div>
            <CheckboxVisual className="absolute inset-[11.43%_14.36%_73.88%_67.18%]" property1="white" />
          </button>
          <button className="block h-[245px] relative shrink-0 w-[195px]" data-node-id="40000473:8682" data-name="Card Ilustration">
            <div className="absolute h-[213px] left-[16px] top-[16px] w-[163px]" data-node-id="I40000473:8682;280:10975">
              <div className="-translate-x-1/2 absolute bg-[var(--colors\/blueprint\/light-blue\/400,#49aee1)] border-16 border-[var(--colors\/blueprint\/gray\/400,#36363f)] border-solid h-[213px] left-1/2 rounded-[12px] top-0 w-[163px]" data-node-id="I40000473:8682;254:10183" />
              <div className="absolute h-[180px] left-0 overflow-clip rounded-[12px] top-0 w-[163px]" data-node-id="I40000473:8682;280:10982" data-name="Illustration-blue">
                <div className="absolute left-[21px] size-[120px] top-[30px]" data-node-id="I40000473:8682;280:10982;280:11336" data-name="Avatar">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgAvatar1} />
                </div>
              </div>
            </div>
            <div className="-translate-x-1/2 absolute contents left-[calc(50%+0.5px)] top-[190px]" data-node-id="I40000473:8682;254:10184">
              <div className="-translate-x-1/2 absolute bg-[var(--colors\/blueprint\/gray\/400,#36363f)] h-[47px] left-[calc(50%+0.5px)] rounded-[12px] top-[190px] w-[124px]" data-node-id="I40000473:8682;254:10185" />
              <div className="-translate-x-1/2 -translate-y-1/2 [word-break:break-word] absolute flex flex-col font-['Anton:Regular'] justify-center leading-[0] left-[calc(50%+0.5px)] not-italic text-[20px] text-[color:var(--colors\/neutral\/warm\/50,#f2f3e5)] text-center top-[214.5px] uppercase whitespace-nowrap" data-node-id="I40000473:8682;254:10186">
                <p className="leading-[1.05]">sport</p>
              </div>
            </div>
          </button>
          <button className="block h-[245px] relative shrink-0 w-[195px]" data-node-id="40000473:8683" data-name="Card Ilustration">
            <div className="absolute h-[213px] left-[16px] top-[16px] w-[163px]" data-node-id="I40000473:8683;280:10975">
              <div className="-translate-x-1/2 absolute bg-[var(--colors\/blueprint\/light-blue\/400,#49aee1)] border-16 border-[var(--colors\/blueprint\/gray\/400,#36363f)] border-solid h-[213px] left-1/2 rounded-[12px] top-0 w-[163px]" data-node-id="I40000473:8683;254:10183" />
              <div className="absolute h-[180px] left-0 overflow-clip rounded-[12px] top-0 w-[163px]" data-node-id="I40000473:8683;280:10982" data-name="Illustration-blue">
                <div className="absolute bg-[var(--colors\/blueprint\/dark-blue\/200,#cbd1f5)] left-[21px] overflow-clip rounded-[99px] size-[120px] top-[30px]" data-node-id="I40000473:8683;280:10982;280:11565" data-name="Avatar">
                  <div className="absolute flex h-[37.156px] items-center justify-center left-[-8px] top-[36px] w-[28.157px]">
                    <div className="flex-none rotate-[19.9deg]">
                      <div className="bg-[var(--colors\/blueprint\/coral\/400,#e65800)] h-[33px] relative rounded-[4px] w-[18px]" data-node-id="I40000473:8683;280:10982;280:11613" />
                    </div>
                  </div>
                  <div className="absolute flex h-[37.156px] items-center justify-center left-[101px] top-[39px] w-[28.157px]">
                    <div className="-scale-y-100 flex-none rotate-[160.1deg]">
                      <div className="bg-[var(--colors\/blueprint\/coral\/400,#e65800)] h-[33px] relative rounded-[4px] w-[18px]" data-node-id="I40000473:8683;280:10982;280:11614" />
                    </div>
                  </div>
                  <div className="-translate-x-1/2 absolute h-[29.5px] left-[calc(50%-0.5px)] top-[22px] w-[102.961px]" data-node-id="I40000473:8683;280:10982;280:11609">
                    <div className="absolute inset-[-19.61%_-4.97%_-9.17%_-4.97%]">
                      <img alt="" className="block max-w-none size-full" src={imgFrame1289} />
                    </div>
                  </div>
                  <div className="absolute flex items-center justify-center left-[-8px] size-[137px] top-[22px]">
                    <div className="flex-none rotate-180">
                      <div className="relative size-[137px]" data-node-id="I40000473:8683;280:10982;280:11566" data-name="Polygon">
                        <div className="absolute inset-[2.41%_4.24%_9.55%_4.24%]">
                          <img alt="" className="block max-w-none size-full" src={imgPolygon} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="-translate-x-1/2 absolute left-[calc(50%-0.5px)] size-[7px] top-[91px]" data-node-id="I40000473:8683;280:10982;280:11677">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgEllipse47} />
                  </div>
                  <div className="absolute contents left-[29.38px] top-[55px]" data-node-id="I40000473:8683;280:10982;280:11581">
                    <div className="absolute left-[29.38px] size-[28px] top-[55px]" data-node-id="I40000473:8683;280:10982;280:11580">
                      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup119} />
                    </div>
                    <div className="absolute contents left-[62.62px] top-[55px]" data-node-id="I40000473:8683;280:10982;280:11576">
                      <div className="absolute flex items-center justify-center left-[62.62px] size-[28px] top-[55px]">
                        <div className="-scale-y-100 flex-none">
                          <div className="relative size-[28px]" data-node-id="I40000473:8683;280:10982;280:11579">
                            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup118} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="-translate-x-1/2 absolute contents left-[calc(50%+0.5px)] top-[190px]" data-node-id="I40000473:8683;254:10184">
              <div className="-translate-x-1/2 absolute bg-[var(--colors\/blueprint\/gray\/400,#36363f)] h-[47px] left-[calc(50%+0.5px)] rounded-[12px] top-[190px] w-[124px]" data-node-id="I40000473:8683;254:10185" />
              <div className="-translate-x-1/2 -translate-y-1/2 [word-break:break-word] absolute flex flex-col font-['Anton:Regular'] justify-center leading-[0] left-[calc(50%+1px)] not-italic text-[20px] text-[color:var(--colors\/neutral\/warm\/50,#f2f3e5)] text-center top-[214.5px] uppercase whitespace-nowrap" data-node-id="I40000473:8683;254:10186">
                <p className="leading-[1.05]">art/music</p>
              </div>
            </div>
          </button>
          <button className="block h-[245px] relative shrink-0 w-[195px]" data-node-id="40000473:8684" data-name="Card Ilustration">
            <div className="absolute h-[213px] left-[16px] top-[16px] w-[163px]" data-node-id="I40000473:8684;280:10975">
              <div className="-translate-x-1/2 absolute bg-[var(--colors\/blueprint\/light-blue\/400,#49aee1)] border-16 border-[var(--colors\/blueprint\/gray\/400,#36363f)] border-solid h-[213px] left-1/2 rounded-[12px] top-0 w-[163px]" data-node-id="I40000473:8684;254:10183" />
              <div className="absolute h-[180px] left-0 overflow-clip rounded-[12px] top-0 w-[163px]" data-node-id="I40000473:8684;280:10982" data-name="Illustration-blue">
                <div className="absolute bg-[var(--colors\/blueprint\/dark-blue\/200,#cbd1f5)] left-[21px] overflow-clip rounded-[99px] size-[120px] top-[30px]" data-node-id="I40000473:8684;280:10982;280:11681" data-name="Avatar">
                  <div className="-translate-x-1/2 absolute contents left-[calc(50%-57.27px)] top-[-5px]" data-node-id="I40000473:8684;280:10982;280:11697">
                    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%-57.27px)] size-[115.457px] top-[calc(50%-7.27px)]" data-node-id="I40000473:8684;280:10982;280:11698" data-name="Soft Flower">
                      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSoftFlower} />
                    </div>
                    <div className="-translate-x-1/2 -translate-y-1/2 absolute content-stretch flex gap-[4.507px] h-[24.125px] items-center left-[calc(50%-42.96px)] top-[calc(50%-11.27px)] w-[52.757px]" data-node-id="I40000473:8684;280:10982;280:11699">
                      <div className="relative shrink-0 size-[24.125px]" data-node-id="I40000473:8684;280:10982;280:11700">
                        <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup114} />
                      </div>
                      <div className="relative shrink-0 size-[24.125px]" data-node-id="I40000473:8684;280:10982;280:11703">
                        <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup115} />
                      </div>
                    </div>
                    <div className="-translate-x-1/2 absolute left-[calc(50%-42.96px)] size-[24.124px] top-[48.93px]" data-node-id="I40000473:8684;280:10982;280:11706">
                      <div className="absolute inset-[70.07%_14.64%_0_11.41%]">
                        <img alt="" className="block max-w-none size-full" src={imgEllipse22} />
                      </div>
                    </div>
                  </div>
                  <div className="absolute left-[50px] size-[147.675px] top-[-15px]" data-node-id="I40000473:8684;280:10982;280:11717">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgGroup121} />
                  </div>
                </div>
              </div>
            </div>
            <div className="-translate-x-1/2 absolute contents left-[calc(50%+0.5px)] top-[190px]" data-node-id="I40000473:8684;254:10184">
              <div className="-translate-x-1/2 absolute bg-[var(--colors\/blueprint\/gray\/400,#36363f)] h-[47px] left-[calc(50%+0.5px)] rounded-[12px] top-[190px] w-[124px]" data-node-id="I40000473:8684;254:10185" />
              <div className="-translate-x-1/2 -translate-y-1/2 [word-break:break-word] absolute flex flex-col font-['Anton:Regular'] justify-center leading-[0] left-[calc(50%+1px)] not-italic text-[20px] text-[color:var(--colors\/neutral\/warm\/50,#f2f3e5)] text-center top-[214.5px] uppercase whitespace-nowrap" data-node-id="I40000473:8684;254:10186">
                <p className="leading-[1.05]">a good talk</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
