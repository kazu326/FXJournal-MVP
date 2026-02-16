import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DashboardSummaryCard } from './components/DashboardSummaryCard';
import { BehaviorScatterChart } from './components/BehaviorScatterChart';
import { BehaviorUserList } from './components/BehaviorUserList';
import { Users, TrendingDown, Activity } from 'lucide-react';

interface BehaviorData {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  first_learning_date: string | null;
  avg_trades_before: number;
  avg_trades_after: number;
  trades_before: number;
  trades_after: number;
  change_percentage: number;
}

export default function AdminBehavior() {
  const [data, setData] = useState<BehaviorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch behavior change data
        // Try to join with users to get profile info
        const { data: behaviorData, error: behaviorError } = await supabase
          .from('admin_behavior_change')
          .select('*, trades_after_learning, trades_before_learning, users(username, avatar_url)');

        if (behaviorError) throw behaviorError;

        console.log('Raw API Response:', behaviorData[0]); // Debug log

        const formattedData = behaviorData.map((item: any) => {
          // Calculate avg after based on ELAPSED TIME (now - learning_date), not just active trading range
          const now = new Date();
          const learningDate = item.first_learning_date ? new Date(item.first_learning_date) : new Date();
          const diffTime = Math.max(0, now.getTime() - learningDate.getTime());
          const diffDays = Math.max(1, diffTime / (1000 * 60 * 60 * 24)); // Minimum 1 day to avoid infinity

          const tradesAfter = item.trades_after_learning || 0;
          const tradesBefore = item.trades_before_learning || 0;

          // Use DB's before-average (historical density is fine), but Recalculate after-average
          const avgBefore = Number(item.avg_trades_per_day_before) || 0;
          const avgAfter = tradesAfter / diffDays;

          // Recalculate change percentage
          let changePct = 0;
          if (avgBefore > 0) {
            changePct = ((avgAfter - avgBefore) / avgBefore) * 100;
          }

          return {
            user_id: item.user_id,
            username: item.users?.username || 'Unknown',
            avatar_url: item.users?.avatar_url,
            first_learning_date: item.first_learning_date,
            avg_trades_before: avgBefore,
            avg_trades_after: avgAfter,
            trades_before: tradesBefore,
            trades_after: tradesAfter,
            change_percentage: changePct
          };
        });

        console.log('Formatted Data:', formattedData[0]); // Debug log

        // Sort by change percentage descending (magnitude of change)
        formattedData.sort((a: BehaviorData, b: BehaviorData) => Math.abs(b.change_percentage) - Math.abs(a.change_percentage));

        setData(formattedData);
      } catch (err: any) {
        console.error('Error fetching behavior data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // metrics
  const totalUsers = data.length;
  // improved = reduced frequency (negative change)
  const improvedUsers = data.filter(d => d.change_percentage < 0).length;
  const avgChange = data.reduce((acc, curr) => acc + curr.change_percentage, 0) / (totalUsers || 1);

  if (loading) return <div className="p-8 text-slate-400">Loading analysis...</div>;
  if (error) return <div className="p-8 text-rose-400">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">行動変容分析 (Behavior Analysis)</h1>
        <p className="text-slate-400">学習・介入による取引行動の変化をモニタリングします。</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardSummaryCard
          title="分析対象ユーザー"
          value={totalUsers}
          icon={Users}
          color="blue"
        />
        <DashboardSummaryCard
          title="取引頻度減少 (改善)"
          value={improvedUsers}
          icon={TrendingDown}
          subValue={`${((improvedUsers / (totalUsers || 1)) * 100).toFixed(1)}%`}
          trend="up" // "up" implies the metric (improvement count) is good. 
          // Note: DashboardSummaryCard prop 'trend' might trigger color, verify implementation.
          color="emerald"
        />
        <DashboardSummaryCard
          title="平均変化率"
          value={`${avgChange > 0 ? '+' : ''}${avgChange.toFixed(1)}%`}
          icon={Activity}
          trend={avgChange < 0 ? "down" : "up"}
          color="purple"
        />
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BehaviorScatterChart data={data} />
        {/* We can put the list here or below. Prompt said "List users". 
            Putting list in the second column or full width below?
            Scatter needs width. List needs height. 
            Let's put Scatter top, List bottom or side-by-side if list is compact.
            List is 5 cols, might be tight. Let's do full width for list.
        */}
      </div>
      <BehaviorUserList users={data} />
    </div>
  );
}
