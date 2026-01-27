import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useBusinesses, BusinessFilter } from '@/hooks/useBusinesses';
import { Bot, User, Search, RefreshCw, Loader2, ArrowUpDown } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import React from 'react';

type SortField = 'name' | 'num_of_leads' | 'lastLeadsendat' | 'human_mode';
type SortDirection = 'asc' | 'desc';

export default function CustomerDashboard() {
  const { businesses, loading, filter, setFilter, toggleHumanMode, refetch } = useBusinesses();
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('lastLeadsendat');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleToggle = async (businessId: string, currentStatus: boolean | null) => {
    setTogglingId(businessId);
    await toggleHumanMode(businessId, currentStatus);
    setTogglingId(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedBusinesses = businesses
    .filter((business) => {
      const searchLower = search.toLowerCase();
      return (
        (business.name?.toLowerCase().includes(searchLower) ?? false) ||
        (business.category?.toLowerCase().includes(searchLower) ?? false) ||
        (business.whatsapp?.toLowerCase().includes(searchLower) ?? false)
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'num_of_leads':
          comparison = (a.num_of_leads || 0) - (b.num_of_leads || 0);
          break;
        case 'lastLeadsendat':
          const dateA = a.lastLeadsendat ? new Date(a.lastLeadsendat).getTime() : 0;
          const dateB = b.lastLeadsendat ? new Date(b.lastLeadsendat).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'human_mode':
          comparison = Number(a.human_mode ?? false) - Number(b.human_mode ?? false);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const SortableHeader = React.forwardRef<
    HTMLTableCellElement,
    { field: SortField; children: React.ReactNode }
  >(({ field, children }, ref) => (
    <TableHead 
      ref={ref}
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`h-4 w-4 ${sortField === field ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
    </TableHead>
  ));
  SortableHeader.displayName = 'SortableHeader';

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Business Dashboard</h1>
            <p className="text-muted-foreground">
              Manage Human-in-the-Loop controls for business communications
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Businesses</CardTitle>
            <CardDescription>
              Toggle between Buddy (auto-reply) and Human (manual) mode for each business
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, category, or whatsapp..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={filter}
                onValueChange={(value) => setFilter(value as BusinessFilter)}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Businesses</SelectItem>
                  <SelectItem value="human_mode">Human Mode Active</SelectItem>
                  <SelectItem value="buddy_mode">Buddy Active</SelectItem>
                  <SelectItem value="recent_activity">Recent Activity (24h)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredAndSortedBusinesses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No businesses found</p>
                {search && (
                  <p className="text-sm mt-1">Try adjusting your search or filter</p>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader field="name">Business Name</SortableHeader>
                      <SortableHeader field="num_of_leads">Total Leads Sent</SortableHeader>
                      <SortableHeader field="lastLeadsendat">Last Lead Sent</SortableHeader>
                      <SortableHeader field="human_mode">Mode Status</SortableHeader>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedBusinesses.map((business) => (
                      <TableRow key={business.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{business.name || 'Unnamed'}</p>
                            {business.category && (
                              <p className="text-sm text-muted-foreground">{business.category}</p>
                            )}
                            {business.whatsapp && (
                              <p className="text-xs text-muted-foreground">{business.whatsapp}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{business.num_of_leads || 0}</span>
                        </TableCell>
                        <TableCell>
                          {business.lastLeadsendat ? (
                            <div>
                              <p className="text-sm">
                                {formatDistanceToNow(new Date(business.lastLeadsendat), {
                                  addSuffix: true,
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(business.lastLeadsendat), 'MMM d, yyyy HH:mm')}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {business.human_mode ? (
                            <Badge className="bg-warning/10 text-warning border border-warning/30">
                              <User className="h-3 w-3 mr-1" />
                              Manual (Human)
                            </Badge>
                          ) : (
                            <Badge className="bg-success/10 text-success border border-success/30">
                              <Bot className="h-3 w-3 mr-1" />
                              Auto (Buddy)
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={business.human_mode ? 'default' : 'destructive'}
                            onClick={() => handleToggle(business.id, business.human_mode)}
                            disabled={togglingId === business.id}
                            className="min-w-[140px]"
                          >
                            {togglingId === business.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Updating...
                              </>
                            ) : business.human_mode ? (
                              <>
                                <Bot className="h-4 w-4 mr-2" />
                                Resume Buddy
                              </>
                            ) : (
                              <>
                                <User className="h-4 w-4 mr-2" />
                                Enable Human Mode
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredAndSortedBusinesses.length} of {businesses.length} businesses
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
