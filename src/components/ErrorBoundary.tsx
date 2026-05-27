import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const screenName = this.props.name ?? "this screen";
      return (
        <div className="flex-1 flex items-center justify-center bg-[#0b0b10]">
          <div className="flex flex-col items-center text-center px-8 max-w-sm">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-sm text-zinc-300 font-medium mb-1">
              {screenName} encountered an error
            </p>
            <p className="text-xs text-zinc-600 mb-4 leading-relaxed">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReload}
              className="h-8 px-3 rounded-lg text-xs border-white/[0.1] text-zinc-300 hover:text-zinc-100 hover:bg-white/[0.06]"
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Reload
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
