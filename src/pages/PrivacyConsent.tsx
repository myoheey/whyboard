import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Shield, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface LocationState {
  signupData?: {
    email: string;
    password: string;
    fullName: string;
  };
  isGoogleSignup?: boolean;
}

const PrivacyConsent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp } = useAuth();
  const state = location.state as LocationState;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // 개인정보 수집 및 이용 동의
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  const canProceed = privacyAgreed;

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError("");

    try {
      // 동의 정보를 localStorage에 저장 (Google OAuth 후 확인용)
      localStorage.setItem("privacy_consent_agreed", "true");
      localStorage.setItem("privacy_consent_date", new Date().toISOString());

      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        setError(`구글 로그인 실패: ${error.message}`);
      }
    } catch (err) {
      setError(`구글 로그인 중 오류가 발생했습니다: ${err}`);
    }

    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!canProceed) return;

    // Google 로그인인 경우
    if (state?.isGoogleSignup) {
      await handleGoogleSignUp();
      return;
    }

    // 일반 회원가입인 경우
    if (!state?.signupData) {
      setError("회원가입 정보가 없습니다. 다시 시도해주세요.");
      return;
    }

    setIsLoading(true);
    setError("");

    const { email, password, fullName } = state.signupData;
    const { error } = await signUp(email, password, fullName);

    if (error) {
      setError(error.message);
    } else {
      // 동의 정보 저장 (추후 필요시 사용)
      localStorage.setItem("privacy_consent_agreed", "true");
      localStorage.setItem("privacy_consent_date", new Date().toISOString());

      navigate("/auth", {
        state: { message: "회원가입이 완료되었습니다. 이메일을 확인해주세요." },
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/auth")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
              PinCanvas
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold">개인정보 수집 및 이용 동의</h2>
          <p className="text-muted-foreground mt-2">PinCanvas 서비스 이용을 위해 아래 내용을 확인하고 동의해주세요</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 개인정보 수집 및 이용 동의 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              개인정보 수집 및 이용 동의 (필수)
            </CardTitle>
            <CardDescription>PinCanvas 서비스 제공을 위해 아래와 같이 개인정보를 수집 및 이용합니다</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 rounded-md border p-4 bg-gray-50">
              <div className="space-y-6 text-sm">
                <section>
                  <h4 className="font-semibold text-base mb-2">1. 수집하는 개인정보 항목</h4>
                  <p className="text-muted-foreground mb-2">
                    PinCanvas는 서비스 제공을 위해 최소한의 개인정보만을 수집합니다.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>
                      <strong>필수 항목:</strong> 이메일 주소, 비밀번호 (암호화 저장), 생년월일
                    </li>
                    <li>
                      <strong>선택 항목:</strong> 이름, 프로필 이미지
                    </li>
                    <li>
                      <strong>자동 수집 항목:</strong> 서비스 이용 기록, 접속 로그
                    </li>
                  </ul>
                </section>

                <Separator />

                <section>
                  <h4 className="font-semibold text-base mb-2">2. 개인정보의 수집 및 이용 목적</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>회원 가입 및 관리: 회원 식별, 가입 의사 확인, 연령 확인 (만 14세 이상)</li>
                    <li>서비스 제공: 캔버스 생성/편집, 공유 기능 제공</li>
                    <li>고객 지원: 문의 응대, 서비스 관련 안내</li>
                    <li>서비스 개선: 이용 통계 분석, 기능 개선</li>
                  </ul>
                </section>

                <Separator />

                <section>
                  <h4 className="font-semibold text-base mb-2">3. 개인정보의 보유 및 이용 기간</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>
                      <strong>회원 정보:</strong> 회원 탈퇴 시까지 (탈퇴 후 지체없이 파기)
                    </li>
                    <li>
                      <strong>서비스 이용 기록:</strong> 3년 (전자상거래법)
                    </li>
                    <li>
                      <strong>접속 로그:</strong> 3개월 (통신비밀보호법)
                    </li>
                  </ul>
                </section>

                <Separator />

                <section>
                  <h4 className="font-semibold text-base mb-2">4. 개인정보의 안전성 확보 조치</h4>
                  <p className="text-muted-foreground mb-2">
                    PinCanvas는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>비밀번호의 암호화 저장 및 관리</li>
                    <li>SSL/TLS를 통한 데이터 전송 암호화</li>
                    <li>개인정보 접근 권한 제한</li>
                    <li>정기적인 보안 점검</li>
                  </ul>
                </section>

                <Separator />

                <section>
                  <h4 className="font-semibold text-base mb-2">5. 이용자의 권리 및 행사 방법</h4>
                  <p className="text-muted-foreground mb-2">이용자는 언제든지 다음과 같은 권리를 행사할 수 있습니다.</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>개인정보 열람 요구</li>
                    <li>오류 등이 있을 경우 정정 요구</li>
                    <li>삭제 요구</li>
                    <li>처리정지 요구</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    권리 행사는 프로필 설정 페이지에서 직접 하시거나, 개인정보 보호책임자에게 서면, 이메일 등으로
                    연락하시면 지체없이 조치하겠습니다.
                  </p>
                </section>

                <Separator />

                <section>
                  <h4 className="font-semibold text-base mb-2">6. 만 14세 미만 아동의 가입 제한</h4>
                  <p className="text-muted-foreground">
                    PinCanvas는 만 14세 미만의 아동은 가입할 수 없습니다.
                    <br />
                    회원가입 시 생년월일 입력을 통해 연령을 확인하며, 만 14세 미만인 경우 회원가입이 제한됩니다. <br />
                    만약 만 14세 미만 아동의 개인정보가 수집된 것이 확인될 경우, 해당 정보는 지체없이 파기됩니다.
                  </p>
                </section>

                <Separator />

                <section>
                  <h4 className="font-semibold text-base mb-2">7. 개인정보 보호책임자</h4>
                  <ul className="list-none space-y-1 text-muted-foreground ml-2">
                    <li>
                      <strong>담당부서:</strong> PinCanvas 운영팀
                    </li>
                    <li>
                      <strong>연락처:</strong> privacy@pincanvas.app
                    </li>
                  </ul>
                </section>

                <Separator />

                <section>
                  <h4 className="font-semibold text-base mb-2">8. 개인정보의 제3자 제공</h4>
                  <p className="text-muted-foreground">
                    PinCanvas는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 이용자의 동의가 있거나
                    법령에 의해 요구되는 경우에는 예외로 합니다.
                  </p>
                </section>

                <Separator />

                <section>
                  <h4 className="font-semibold text-base mb-2">9. 개인정보 처리 위탁</h4>
                  <p className="text-muted-foreground mb-2">
                    PinCanvas는 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                    <li>
                      <strong>Supabase:</strong> 데이터베이스 및 인증 서비스 운영
                    </li>
                  </ul>
                </section>
              </div>
            </ScrollArea>

            <div className="flex items-center space-x-2 mt-4 p-3 bg-blue-50 rounded-lg">
              <Checkbox
                id="privacy-agree"
                checked={privacyAgreed}
                onCheckedChange={() => setPrivacyAgreed(!privacyAgreed)}
              />
              <Label htmlFor="privacy-agree" className="text-sm font-medium cursor-pointer">
                위 개인정보 수집 및 이용에 동의합니다 (필수)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* 버튼 영역 */}
        <div className="flex gap-4">
          <Button variant="outline" className="flex-1" onClick={() => navigate("/auth")}>
            취소
          </Button>
          <Button className="flex-1 gradient-primary" onClick={handleSubmit} disabled={!canProceed || isLoading}>
            {isLoading ? "처리 중..." : state?.isGoogleSignup ? "Google로 가입하기" : "동의하고 가입하기"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyConsent;
