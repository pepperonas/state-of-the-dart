// Export/Import utilities for all app data

import { TenantStorage } from './storage';
import { ExportData } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, formatDateShort } from './dateUtils';

/**
 * Export all data for the current tenant to a JSON file
 */
export const exportTenantData = (tenantId: string, tenantName: string): void => {
  try {
    const storage = new TenantStorage(tenantId);
    
    // Gather all data from localStorage
    const exportData: ExportData = {
      version: '1.0.0',
      exportedAt: new Date(),
      players: storage.get('players', []),
      matches: storage.get('matches', []),
      tournaments: storage.get('tournaments', []),
      trainingSessions: storage.get('trainingSessions', []),
      achievements: storage.get('achievements', []),
      settings: storage.get('settings', {
        theme: 'dark',
        language: 'de',
        soundVolume: 0.7,
        showCheckoutHints: true,
        checkoutRange: 170,
        showAverage: true,
        doubleOut: true,
        doubleIn: false,
        soundEnabled: true,
        volume: 0.7,
        autoNextPlayer: true,
        showStatsDuringGame: true,
        confirmScores: false,
        vibrationEnabled: false,
        showDartboardHelper: true,
      }),
    };
    
    // Add tenant info
    const fullExport = {
      ...exportData,
      tenantId,
      tenantName,
    };
    
    // Create JSON blob
    const jsonString = JSON.stringify(fullExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `state-of-the-dart-${tenantName}-${new Date().toISOString().split('T')[0]}.json`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ Data exported successfully');
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw new Error('Failed to export data');
  }
};

/**
 * Import data from a JSON file
 */
export const importTenantData = (file: File, tenantId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const importData = JSON.parse(jsonString);
        
        // Validate data structure
        if (!importData.version || !importData.exportedAt) {
          throw new Error('Invalid export file format');
        }
        
        const storage = new TenantStorage(tenantId);
        
        // Import all data
        if (importData.players) storage.set('players', importData.players);
        if (importData.matches) storage.set('matches', importData.matches);
        if (importData.tournaments) storage.set('tournaments', importData.tournaments);
        if (importData.trainingSessions) storage.set('trainingSessions', importData.trainingSessions);
        if (importData.achievements) storage.set('achievements', importData.achievements);
        if (importData.settings) storage.set('settings', importData.settings);
        
        console.log('✅ Data imported successfully');
        resolve();
      } catch (error) {
        console.error('❌ Import failed:', error);
        reject(new Error('Failed to import data. Invalid file format.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

/**
 * Export match history as CSV for analysis in Excel/Google Sheets
 */
export const exportMatchHistoryCSV = (matches: any[], playerName: string): void => {
  try {
    // CSV Header
    const headers = [
      'Date',
      'Player',
      'Opponent',
      'Result',
      'Score',
      'Average',
      'Highest Score',
      '180s',
      '140+',
      '100+',
      'Checkout %',
      'Darts Thrown',
      'First 9 Avg'
    ];
    
    // CSV Rows
    const rows = matches.map(match => {
      const players = match.players || [];
      const player = players.find((p: any) => p.name === playerName);
      const opponent = players.find((p: any) => p.name !== playerName);

      return [
        formatDate(match.startedAt),
        player?.name || '-',
        opponent?.name || '-',
        match.winner === player?.playerId ? 'Win' : 'Loss',
        `${player?.legsWon || 0} - ${opponent?.legsWon || 0}`,
        player?.matchAverage.toFixed(2) || '0',
        player?.matchHighestScore || '0',
        player?.match180s || '0',
        player?.match140Plus || '0',
        player?.match100Plus || '0',
        player?.checkoutAttempts > 0 
          ? ((player?.checkoutsHit / player?.checkoutAttempts) * 100).toFixed(1) + '%'
          : '0%',
        '-', // Could calculate from throws
        '-', // Could calculate from first 9 darts
      ];
    });
    
    // Combine header and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `match-history-${playerName}-${new Date().toISOString().split('T')[0]}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ Match history exported as CSV');
  } catch (error) {
    console.error('❌ CSV export failed:', error);
    throw new Error('Failed to export match history');
  }
};

/**
 * Export match history to Excel
 */
export const exportMatchHistoryExcel = (matches: any[], playerName: string): void => {
  try {
    // Prepare data
    const headers = [
      'Date',
      'Player',
      'Opponent',
      'Result',
      'Score',
      'Average',
      'Highest Score',
      '180s',
      '140+',
      '100+',
      'Checkout %',
      'Legs Won',
      'Legs Lost'
    ];
    
    const rows = matches.map(match => {
      const players = match.players || [];
      const player = players.find((p: any) => p.name === playerName);
      const opponent = players.find((p: any) => p.name !== playerName);

      return [
        formatDate(match.startedAt),
        player?.name || '-',
        opponent?.name || '-',
        match.winner === player?.playerId ? 'Win' : 'Loss',
        `${player?.legsWon || 0} - ${opponent?.legsWon || 0}`,
        parseFloat((player?.matchAverage || 0).toFixed(2)),
        player?.matchHighestScore || 0,
        player?.match180s || 0,
        player?.match140Plus || 0,
        player?.match100Plus || 0,
        player?.checkoutAttempts > 0
          ? parseFloat(((player?.checkoutsHit / player?.checkoutAttempts) * 100).toFixed(1))
          : 0,
        player?.legsWon || 0,
        opponent?.legsWon || 0,
      ];
    });
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Date
      { wch: 15 }, // Player
      { wch: 15 }, // Opponent
      { wch: 8 },  // Result
      { wch: 10 }, // Score
      { wch: 10 }, // Average
      { wch: 14 }, // Highest Score
      { wch: 8 },  // 180s
      { wch: 8 },  // 140+
      { wch: 8 },  // 100+
      { wch: 12 }, // Checkout %
      { wch: 10 }, // Legs Won
      { wch: 10 }, // Legs Lost
    ];
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Match History');
    
    // Add summary sheet
    const totalMatches = matches.length;
    const wins = matches.filter(m => {
      const players = m.players || [];
      const player = players.find((p: any) => p.name === playerName);
      return m.winner === player?.playerId;
    }).length;
    const losses = totalMatches - wins;
    const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : '0';
    
    const avgAverage = matches.length > 0
      ? (matches.reduce((sum, m) => {
          const players = m.players || [];
          const player = players.find((p: any) => p.name === playerName);
          return sum + (player?.matchAverage || 0);
        }, 0) / matches.length).toFixed(2)
      : '0.00';
    
    const total180s = matches.reduce((sum, m) => {
      const players = m.players || [];
      const player = players.find((p: any) => p.name === playerName);
      return sum + (player?.match180s || 0);
    }, 0);
    
    const summaryData = [
      ['Player Summary', ''],
      ['Player Name', playerName],
      ['Total Matches', totalMatches],
      ['Wins', wins],
      ['Losses', losses],
      ['Win Rate', `${winRate}%`],
      ['Average (Avg)', avgAverage],
      ['Total 180s', total180s],
      ['Export Date', formatDate(new Date())],
    ];
    
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    
    // Download
    XLSX.writeFile(wb, `match-history-${playerName}-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    console.log('✅ Match history exported as Excel');
  } catch (error) {
    console.error('❌ Excel export failed:', error);
    throw new Error('Failed to export match history to Excel');
  }
};

/**
 * Export match history to PDF
 */
export const exportMatchHistoryPDF = (matches: any[], playerName: string): void => {
  try {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Match History Report', 14, 20);
    
    // Add player info
    doc.setFontSize(12);
    doc.text(`Player: ${playerName}`, 14, 30);
    doc.text(`Export Date: ${formatDate(new Date())}`, 14, 37);
    doc.text(`Total Matches: ${matches.length}`, 14, 44);
    
    // Calculate summary stats
    const wins = matches.filter(m => {
      const players = m.players || [];
      const player = players.find((p: any) => p.name === playerName);
      return m.winner === player?.playerId;
    }).length;
    const winRate = matches.length > 0 ? ((wins / matches.length) * 100).toFixed(1) : '0';
    
    doc.text(`Win Rate: ${winRate}%`, 14, 51);
    
    // Prepare table data
    const tableData = matches.map(match => {
      const players = match.players || [];
      const player = players.find((p: any) => p.name === playerName);
      const opponent = players.find((p: any) => p.name !== playerName);

      return [
        formatDate(match.startedAt),
        opponent?.name || '-',
        match.winner === player?.playerId ? 'W' : 'L',
        `${player?.legsWon || 0}-${opponent?.legsWon || 0}`,
        (player?.matchAverage || 0).toFixed(1),
        player?.match180s || '0',
        player?.checkoutAttempts > 0 
          ? ((player?.checkoutsHit / player?.checkoutAttempts) * 100).toFixed(0) + '%'
          : '0%',
      ];
    });
    
    // Add table
    autoTable(doc, {
      startY: 60,
      head: [['Date', 'Opponent', 'W/L', 'Score', 'Avg', '180s', 'CO%']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }, // Primary blue
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 20, halign: 'right' },
      },
    });
    
    // Add footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount} | State of the Dart`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Save
    doc.save(`match-history-${playerName}-${new Date().toISOString().split('T')[0]}.pdf`);
    
    console.log('✅ Match history exported as PDF');
  } catch (error) {
    console.error('❌ PDF export failed:', error);
    throw new Error('Failed to export match history to PDF');
  }
};

/**
 * Calculate improvement metrics over time
 */
export interface ImprovementMetrics {
  averageImprovement: number;
  checkoutImprovement: number;
  consistencyImprovement: number;
  trend: 'improving' | 'stable' | 'declining';
  recentAverage: number;
  historicAverage: number;
  bestPeriod: {
    start: Date;
    end: Date;
    average: number;
  };
  worstPeriod: {
    start: Date;
    end: Date;
    average: number;
  };
}

export const calculateImprovement = (matches: any[]): ImprovementMetrics => {
  if (matches.length === 0) {
    return {
      averageImprovement: 0,
      checkoutImprovement: 0,
      consistencyImprovement: 0,
      trend: 'stable',
      recentAverage: 0,
      historicAverage: 0,
      bestPeriod: { start: new Date(), end: new Date(), average: 0 },
      worstPeriod: { start: new Date(), end: new Date(), average: 0 },
    };
  }
  
  // Sort matches by date
  const sortedMatches = [...matches].sort((a, b) => 
    new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  );
  
  // Calculate recent vs historic average (last 10 vs all previous)
  const recentMatches = sortedMatches.slice(-10);
  const historicMatches = sortedMatches.slice(0, -10);
  
  const recentAvg = recentMatches.length > 0
    ? recentMatches.reduce((sum, m) => {
        const players = m.players || [];
        const player = players[0];
        return sum + (player?.matchAverage || 0);
      }, 0) / recentMatches.length
    : 0;
  
  const historicAvg = historicMatches.length > 0
    ? historicMatches.reduce((sum, m) => {
        const players = m.players || [];
        const player = players[0];
        return sum + (player?.matchAverage || 0);
      }, 0) / historicMatches.length
    : recentAvg;
  
  const averageImprovement = recentAvg - historicAvg;
  
  // Calculate checkout improvement
  const recentCheckout = recentMatches.length > 0
    ? recentMatches.reduce((sum, m) => {
        const players = m.players || [];
        const player = players[0];
        return sum + (player && player.checkoutAttempts > 0 
          ? (player.checkoutsHit / player.checkoutAttempts) 
          : 0);
      }, 0) / recentMatches.length
    : 0;
  
  const historicCheckout = historicMatches.length > 0
    ? historicMatches.reduce((sum, m) => {
        const players = m.players || [];
        const player = players[0];
        return sum + (player && player.checkoutAttempts > 0 
          ? (player.checkoutsHit / player.checkoutAttempts) 
          : 0);
      }, 0) / historicMatches.length
    : recentCheckout;
  
  const checkoutImprovement = (recentCheckout - historicCheckout) * 100;
  
  // Determine trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (averageImprovement > 2) trend = 'improving';
  else if (averageImprovement < -2) trend = 'declining';
  
  // Find best and worst periods (sliding window of 5 matches)
  let bestPeriod = { start: new Date(), end: new Date(), average: 0 };
  let worstPeriod = { start: new Date(), end: new Date(), average: 999 };
  
  for (let i = 0; i <= sortedMatches.length - 5; i++) {
    const window = sortedMatches.slice(i, i + 5);
    const windowAvg = window.reduce((sum, m) => {
      const players = m.players || [];
      const player = players[0];
      return sum + (player?.matchAverage || 0);
    }, 0) / 5;
    
    if (windowAvg > bestPeriod.average) {
      bestPeriod = {
        start: new Date(window[0].startedAt),
        end: new Date(window[4].startedAt),
        average: windowAvg,
      };
    }
    
    if (windowAvg < worstPeriod.average) {
      worstPeriod = {
        start: new Date(window[0].startedAt),
        end: new Date(window[4].startedAt),
        average: windowAvg,
      };
    }
  }
  
  return {
    averageImprovement,
    checkoutImprovement,
    consistencyImprovement: 0, // TODO: Calculate standard deviation
    trend,
    recentAverage: recentAvg,
    historicAverage: historicAvg,
    bestPeriod,
    worstPeriod,
  };
};
