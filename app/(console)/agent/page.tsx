import { agentEvidence, agentHistory, quickPrompts } from "@/lib/mock-data";

export default function AgentPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden">
      <section className="z-10 shrink-0 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-8 py-5">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4 border-r border-slate-200 pr-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                <span className="text-3xl">◉</span>
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                  Run Interpreter
                </h1>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  Evidence-Based Operational Co-Pilot
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Workspace
                </p>
                <p className="text-sm font-bold text-slate-800">Hangyeol Pharma</p>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Target Context (Run)
                </p>
                <button className="flex items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-bold text-sky-600 transition-colors hover:bg-slate-100">
                  <span className="font-mono">RUN-20260330-01</span>
                  <span className="text-[14px] text-slate-500">⌄</span>
                </button>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Status
                </p>
                <div className="flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                    WARN
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end text-right">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <span>ⓘ</span>
              답변은 오직 <b>현재 선택된 RUN</b>과 파생된 Evidence만을 기준으로 합니다.
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              이 에이전트는 계산 및 데이터 변조를 수행하지 않는 순수 해석 레이어입니다.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden bg-slate-50">
          <div className="flex-1 space-y-8 overflow-y-auto p-10">
            <div className="text-center">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-[10px] text-slate-400 shadow-sm">
                Conversation initiated for RUN-20260330-01 • Mar 30, 2026, 14:45 KST
              </span>
            </div>

            <div className="flex justify-end gap-4">
              <div className="max-w-2xl rounded-2xl rounded-tr-sm bg-slate-800 px-6 py-4 text-white shadow-sm">
                <p className="text-sm leading-relaxed">
                  이번 파이프라인(RUN-20260330-01)에서 발생한 WARN의 핵심 원인은 뭐야?
                  어떤 Result Asset을 중심으로 데이터를 확인해야 하는지 요약해줘.
                </p>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-slate-600">
                ME
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                <span className="text-2xl">◉</span>
              </div>
              <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-start gap-4 border-b border-slate-100 pb-5">
                  <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-100 px-3 py-1 text-amber-700">
                    <span className="block text-xs font-bold uppercase tracking-widest">
                      Primary Verdict
                    </span>
                    <span className="text-lg font-bold">Unmapped Clinics Exceed Threshold</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-relaxed text-slate-600">
                      현재 RUN의 <strong className="text-amber-600">WARN</strong> 상태는{" "}
                      <b>Territory 단계</b>에서 발생했습니다. 신규 클리닉 18곳이 기존 Master
                      데이터에 매핑되지 않아 'Unknown Region' 풀로 강제 편입되었고, 이 수치가
                      허용 임계치 1.0%를 초과한 <b>1.5%</b>로 집계되었습니다.
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                    Structured Reasoning & Evidence
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 text-sky-500">●</span>
                      <p className="text-sm text-slate-700">
                        <b>발생 지점:</b> Intake 단계는 정상 통과했으나, territory mapping module에서
                        예외 처리되었습니다.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-0.5 text-sky-500">●</span>
                      <p className="text-sm text-slate-700">
                        <b>핵심 참조 데이터:</b>{" "}
                        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-sky-600">
                          sandbox_payload_v3.parquet
                        </code>
                        가 하위 모듈들의 최종 계산 근거로 사용되었습니다.
                      </p>
                    </li>
                  </ul>
                </div>

                <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <span className="shrink-0 text-3xl text-slate-400">!</span>
                  <div className="flex-1">
                    <h4 className="mb-1 text-sm font-bold text-slate-900">Recommended Next Action</h4>
                    <p className="text-xs text-slate-600">
                      우측 Evidence 패널의 <strong className="text-slate-800">mapping_exceptions.json</strong>을 열어 누락된 18개의 클리닉 ID를 확인하고, 영업담당자 재할당 여부를 판단하십시오.
                    </p>
                  </div>
                  <button className="shrink-0 rounded bg-slate-800 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-900">
                    View Exceptions
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="z-10 shrink-0 border-t border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
              <span className="mr-2 shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Suggested Prompts
              </span>
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:border-indigo-400 hover:text-indigo-600"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="relative max-w-5xl">
              <textarea
                rows={2}
                placeholder="Ask a question about RUN-20260330-01..."
                className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 py-3 pl-4 pr-16 text-sm text-slate-800 shadow-inner outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
              <button className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-700">
                <span className="text-[18px]">➤</span>
              </button>
            </div>
            <p className="mt-2 max-w-5xl text-center text-[10px] text-slate-400">
              결과의 정확성은 현재 파이프라인 내 Validation 요약, Result Assets, Artifacts를
              기반으로 합니다.
            </p>
          </div>
        </div>

        <aside className="relative z-20 hidden w-[420px] shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white shadow-[-4px_0_15px_rgba(0,0,0,0.03)] xl:flex">
          <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5">
            <h3 className="flex items-center gap-2 font-bold text-slate-800">
              <span className="text-indigo-500">◉</span>
              Evidence Stack
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              상단 답변을 생성하는 데 사용된 구조화 근거 자료입니다.
            </p>
          </div>

          <div className="flex-1 space-y-8 overflow-y-auto p-6">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-600">
                  Primary Result Assets
                </h4>
              </div>
              <p className="mb-3 rounded border border-indigo-100 bg-indigo-50 p-2 text-[11px] text-slate-400">
                <b>Result Assets</b>는 단순 로그가 아니라, 다운스트림 비즈니스 모듈에서 소비되는 핵심 구조화 데이터 객체입니다.
              </p>
              <div className="rounded-lg border border-indigo-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between pl-2">
                  <div>
                    <div className="mb-1 flex items-center gap-1.5">
                      <span className="rounded bg-slate-100 px-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        Sandbox Module
                      </span>
                    </div>
                    <h5 className="font-mono text-sm font-bold leading-tight text-slate-800">
                      sandbox_payload_v3.parquet
                    </h5>
                    <p className="mt-1 text-[10px] text-slate-500">
                      최종 분석 및 요약을 위해 시스템에 로딩된 주조 데이터
                    </p>
                  </div>
                  <button className="shrink-0 text-slate-400 transition-colors hover:text-indigo-600">
                    ↗
                  </button>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-slate-100" />

            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-600">
                  Supporting Artifacts
                </h4>
              </div>
              <div className="space-y-3">
                {agentEvidence.map((item, index) => (
                  <div
                    key={item.name}
                    className={`rounded-lg border p-3 shadow-sm ${
                      index === 0
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div>
                      <div className="mb-1 flex items-center gap-1.5">
                        <span
                          className={`rounded px-1 text-[9px] font-bold uppercase tracking-widest ${
                            index === 0
                              ? "bg-amber-200/50 text-amber-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {item.type}
                        </span>
                        {index === 0 ? (
                          <span className="text-[9px] font-bold text-amber-600">
                            Generated w/ Warning
                          </span>
                        ) : null}
                      </div>
                      <h5 className="font-mono text-sm font-bold text-slate-800">{item.name}</h5>
                      <p className="mt-1 text-[10px] text-slate-500">{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-slate-100" />

            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-600">
                  Conversation History
                </h4>
              </div>
              <div className="space-y-3">
                {agentHistory.map((entry) => (
                  <div key={entry.question} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <h5 className="text-xs font-bold text-slate-800">{entry.question}</h5>
                    <p className="mt-1 text-[10px] text-slate-500">{entry.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
